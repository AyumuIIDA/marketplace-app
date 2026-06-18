package workflows

import (
	"context"
	"encoding/json"
	"strings"

	"marketplace/api-go/internal/interface/mcp/mcpgateway"
	agentsapp "marketplace/api-go/internal/modules/agents/application"
	listingsapp "marketplace/api-go/internal/modules/listings/application"
	"marketplace/api-go/internal/shared/apperr"
)

// maxDiscoverToolSteps は plan→tool_call ループの上限（無限ループ/暴走防止）。
const maxDiscoverToolSteps = 3

// McpToolGatewayFactory は実行主体(userId+agentId)を束ねたMCP gatewayを生成する。
// Composition Rootが tools+runner を捕捉して渡す（toolCtxはmcpinterface依存を避け primitiveで受ける）。
type McpToolGatewayFactory func(userID string, agentID *string) mcpgateway.McpToolGateway

// RunDiscoverAgentInput は discover agent 実行の入力。
type RunDiscoverAgentInput struct {
	UserID   string
	AgentID  *string
	Message  string
	Messages []agentsapp.DiscoverMessage
	// Provider はリクエスト単位のベンダー選択("gemini"|"openai")。空なら既定プロバイダ。
	Provider string
}

// DiscoverStep は実行トレースの1ステップ（LLM/MCPの各フェーズ）。
type DiscoverStep struct {
	Index    int    `json:"index"`
	Actor    string `json:"actor"` // "llm" | "mcp"
	Phase    string `json:"phase"` // "plan" | "tool_call" | "reply" | "output"
	Label    string `json:"label"`
	Status   string `json:"status"` // "COMPLETED" | "SKIPPED"
	ToolName string `json:"toolName,omitempty"`
}

// DiscoverToolCall は実行したMCP tool呼び出しの記録。
type DiscoverToolCall struct {
	ToolName  string         `json:"toolName"`
	Arguments map[string]any `json:"arguments"`
	Status    string         `json:"status"`
}

// RunDiscoverAgentResult は discover agent 実行の応答。
type RunDiscoverAgentResult struct {
	Status           string                    `json:"status"`
	AssistantMessage string                    `json:"assistantMessage"`
	Listings         []listingsapp.ListingView `json:"listings"`
	Steps            []DiscoverStep            `json:"steps"`
	ToolCalls        []DiscoverToolCall        `json:"toolCalls"`
}

// RunDiscoverAgentWorkflow は discover agent の orchestration（plan→tool_call→reply→output）。
// MCP gateway(監査付き) + provider別 planner/responder レジストリ を合成する。
type RunDiscoverAgentWorkflow struct {
	gatewayFactory McpToolGatewayFactory
	registry       *agentsapp.DiscoverAgentRegistry
}

func NewRunDiscoverAgentWorkflow(f McpToolGatewayFactory, registry *agentsapp.DiscoverAgentRegistry) *RunDiscoverAgentWorkflow {
	return &RunDiscoverAgentWorkflow{gatewayFactory: f, registry: registry}
}

func (w *RunDiscoverAgentWorkflow) Execute(ctx context.Context, in RunDiscoverAgentInput) (RunDiscoverAgentResult, error) {
	message := strings.TrimSpace(in.Message)
	if message == "" {
		return RunDiscoverAgentResult{}, apperr.Validation("Message is required.",
			apperr.FieldError{Field: "message", Reason: "required"})
	}

	// リクエスト単位でベンダーを解決する（未指定/未登録は既定→決定論へ縮退）。
	agent := w.registry.Resolve(in.Provider)
	gateway := w.gatewayFactory(in.UserID, in.AgentID)

	steps := []DiscoverStep{}
	listings := []listingsapp.ListingView{}
	toolCalls := []DiscoverToolCall{}
	toolResults := []map[string]any{}
	executedPlans := map[string]bool{}

	for toolStep := 1; toolStep <= maxDiscoverToolSteps; toolStep++ {
		var contextMessages []agentsapp.DiscoverMessage
		if toolStep > 1 {
			contextMessages = buildRunContextMessages(toolCalls, listings)
		}
		plan, err := agent.Planner.PlanTool(ctx, agentsapp.PlanDiscoverToolInput{
			UserMessage: message,
			Messages:    contextMessages,
		})
		if err != nil {
			return RunDiscoverAgentResult{}, err
		}
		if err := assertAllowedToolPlan(plan); err != nil {
			return RunDiscoverAgentResult{}, err
		}

		planKey := plan.ToolName + ":" + marshalArgs(plan.Arguments)
		if executedPlans[planKey] {
			steps = append(steps, newStep(len(steps)+1, "llm", "plan",
				"LLM selected an already executed tool plan", "SKIPPED", plan.ToolName))
			break
		}
		executedPlans[planKey] = true
		steps = append(steps, newStep(len(steps)+1, "llm", "plan",
			"LLM selected "+plan.ToolName, "COMPLETED", plan.ToolName))

		raw, err := gateway.CallTool(ctx, mcpgateway.McpToolCallGatewayInput{
			Name:      plan.ToolName,
			Arguments: plan.Arguments,
		})
		if err != nil {
			return RunDiscoverAgentResult{}, err
		}
		result, err := parseToolResult(raw)
		if err != nil {
			return RunDiscoverAgentResult{}, err
		}
		if status, _ := result["status"].(string); status == "FAILED" {
			return RunDiscoverAgentResult{}, toolResultError(result)
		}

		toolResults = append(toolResults, result)
		status, _ := result["status"].(string)
		toolCalls = append(toolCalls, DiscoverToolCall{
			ToolName:  plan.ToolName,
			Arguments: plan.Arguments,
			Status:    status,
		})
		listings = mergeListings(listings, filterListings(readListings(result), message))
		steps = append(steps, newStep(len(steps)+1, "mcp", "tool_call",
			"MCP tool "+plan.ToolName+" completed", "COMPLETED", plan.ToolName))
	}

	reply, err := agent.Responder.BuildReply(ctx, agentsapp.BuildDiscoverReplyInput{
		UserMessage: message,
		Messages:    in.Messages,
		Listings:    toDiscoverListings(listings),
		ToolCalls:   toResponderToolCalls(toolCalls),
		ToolResults: toolResults,
	})
	if err != nil {
		return RunDiscoverAgentResult{}, err
	}
	steps = append(steps, newStep(len(steps)+1, "llm", "reply", "LLM composed the discover reply", "COMPLETED", ""))

	listingIDs := make([]any, 0, len(listings))
	for _, l := range listings {
		listingIDs = append(listingIDs, l.ListingID)
	}
	outputArgs := map[string]any{
		"assistantMessage": reply.AssistantMessage,
		"listingIds":       listingIDs,
	}
	outputRaw, err := gateway.CallTool(ctx, mcpgateway.McpToolCallGatewayInput{
		Name:      "present_discover_output",
		Arguments: outputArgs,
	})
	if err != nil {
		return RunDiscoverAgentResult{}, err
	}
	outputResult, err := parseToolResult(outputRaw)
	if err != nil {
		return RunDiscoverAgentResult{}, err
	}
	steps = append(steps, newStep(len(steps)+1, "mcp", "output",
		"Output MCP tool validated the final answer", "COMPLETED", "present_discover_output"))

	assistantMessage, err := readAssistantMessage(outputResult)
	if err != nil {
		return RunDiscoverAgentResult{}, err
	}

	outputStatus, _ := outputResult["status"].(string)
	toolCalls = append(toolCalls, DiscoverToolCall{
		ToolName:  "present_discover_output",
		Arguments: outputArgs,
		Status:    outputStatus,
	})

	return RunDiscoverAgentResult{
		Status:           "COMPLETED",
		AssistantMessage: assistantMessage,
		Listings:         listings,
		Steps:            steps,
		ToolCalls:        toolCalls,
	}, nil
}

func newStep(index int, actor, phase, label, status, toolName string) DiscoverStep {
	return DiscoverStep{Index: index, Actor: actor, Phase: phase, Label: label, Status: status, ToolName: toolName}
}

func marshalArgs(args map[string]any) string {
	b, err := json.Marshal(args)
	if err != nil {
		return ""
	}
	return string(b)
}

func buildRunContextMessages(toolCalls []DiscoverToolCall, listings []listingsapp.ListingView) []agentsapp.DiscoverMessage {
	names := make([]string, 0, len(toolCalls))
	for _, c := range toolCalls {
		names = append(names, c.ToolName)
	}
	ids := make([]string, 0, len(listings))
	for _, l := range listings {
		ids = append(ids, l.ListingID)
	}
	toolsStr := "none"
	if len(names) > 0 {
		toolsStr = strings.Join(names, ", ")
	}
	idsStr := "none"
	if len(ids) > 0 {
		idsStr = strings.Join(ids, ", ")
	}
	return []agentsapp.DiscoverMessage{{
		Role: "assistant",
		Content: "Current run already executed tools: " + toolsStr + ".\n" +
			"Current run listing IDs: " + idsStr + ".",
	}}
}

func assertAllowedToolPlan(plan agentsapp.DiscoverToolPlan) error {
	switch plan.ToolName {
	case "search_listings", "get_listing", "compare_listings", "suggest_price":
		return nil
	default:
		return apperr.Validation("Selected MCP tool is not allowed.",
			apperr.FieldError{Field: "toolName", Reason: "not_allowed"})
	}
}

// parseToolResult は gateway出力を ToolResult(JSON object) へ正規化する。
func parseToolResult(raw mcpgateway.McpToolCallGatewayOutput) (map[string]any, error) {
	if raw.StructuredContent != nil {
		return raw.StructuredContent, nil
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(raw.ContentText), &m); err != nil {
		return nil, &apperr.AppError{Kind: apperr.KindInternal, Code: "DISCOVER_AGENT_TOOL_RESULT_INVALID", Message: "MCP tool returned invalid JSON."}
	}
	return m, nil
}

func toolResultError(result map[string]any) error {
	code := "DISCOVER_AGENT_TOOL_FAILED"
	message := "MCP tool failed."
	if e, ok := result["error"].(map[string]any); ok {
		if c, ok := e["code"].(string); ok && c != "" {
			code = c
		}
		if m, ok := e["message"].(string); ok && m != "" {
			message = m
		}
	}
	return &apperr.AppError{Kind: apperr.KindInternal, Code: code, Message: message}
}

// readListings は tool結果(SUCCEEDED)から出品配列を取り出す。
// search系は data.items（配列）、get_listing は data 単体。
func readListings(result map[string]any) []listingsapp.ListingView {
	if status, _ := result["status"].(string); status != "SUCCEEDED" {
		return nil
	}
	data, ok := result["data"].(map[string]any)
	if !ok {
		return nil
	}
	if items, ok := data["items"].([]any); ok {
		var views []listingsapp.ListingView
		if err := remarshal(items, &views); err == nil {
			return views
		}
		return nil
	}
	if _, ok := data["listingId"]; ok {
		var view listingsapp.ListingView
		if err := remarshal(data, &view); err == nil {
			return []listingsapp.ListingView{view}
		}
	}
	return nil
}

func readAssistantMessage(result map[string]any) (string, error) {
	if status, _ := result["status"].(string); status == "FAILED" {
		return "", toolResultError(result)
	}
	if data, ok := result["data"].(map[string]any); ok {
		if msg, ok := data["assistantMessage"].(string); ok {
			return msg, nil
		}
	}
	return "", &apperr.AppError{Kind: apperr.KindInternal, Code: "DISCOVER_AGENT_OUTPUT_INVALID", Message: "Output MCP tool returned invalid output."}
}

// filterListings は「署名つき」意図のとき署名済み出品のみへ絞る。
func filterListings(listings []listingsapp.ListingView, message string) []listingsapp.ListingView {
	if !includesSignedIntent(message) {
		return listings
	}
	out := make([]listingsapp.ListingView, 0, len(listings))
	for _, l := range listings {
		if l.SignatureID != nil {
			out = append(out, l)
		}
	}
	return out
}

func includesSignedIntent(message string) bool {
	lower := strings.ToLower(message)
	return strings.Contains(message, "署名") ||
		strings.Contains(lower, "verified") ||
		strings.Contains(lower, "human-signed") ||
		strings.Contains(lower, "human signed")
}

func mergeListings(target, next []listingsapp.ListingView) []listingsapp.ListingView {
	seen := make(map[string]bool, len(target))
	for _, l := range target {
		seen[l.ListingID] = true
	}
	for _, l := range next {
		if seen[l.ListingID] {
			continue
		}
		target = append(target, l)
		seen[l.ListingID] = true
	}
	return target
}

func toDiscoverListings(listings []listingsapp.ListingView) []agentsapp.DiscoverListing {
	out := make([]agentsapp.DiscoverListing, 0, len(listings))
	for _, l := range listings {
		out = append(out, agentsapp.DiscoverListing{
			ListingID: l.ListingID,
			Title:     l.Title,
			Price:     l.Price,
			Currency:  l.Currency,
			Category:  l.Category,
			Condition: l.Condition,
			Signed:    l.SignatureID != nil,
			Status:    l.Status,
		})
	}
	return out
}

func toResponderToolCalls(toolCalls []DiscoverToolCall) []agentsapp.DiscoverToolCallSummary {
	out := make([]agentsapp.DiscoverToolCallSummary, 0, len(toolCalls))
	for _, c := range toolCalls {
		out = append(out, agentsapp.DiscoverToolCallSummary{
			ToolName:  c.ToolName,
			Arguments: c.Arguments,
			Status:    c.Status,
		})
	}
	return out
}

// remarshal は map/slice(any) を JSON経由で型付き構造体へ変換する。
func remarshal(src any, dst any) error {
	b, err := json.Marshal(src)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, dst)
}
