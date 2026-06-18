package agentsinfra

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"

	"google.golang.org/genai"

	agentsapp "github.com/outarc/marketplace/api-go/internal/modules/agents/application"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// Vertex AI(Gemini) 版 discover planner/responder。認証はADC（Cloud Run SA）。
// 応答はJSONで受け、markdownフェンス等に頑健なJSON抽出を通してからparseする。

var fencedJSONRe = regexp.MustCompile("(?is)^```(?:json)?\\s*(.*?)\\s*```$")

func newGeminiClient(ctx context.Context, project, location string) (*genai.Client, error) {
	c, err := genai.NewClient(ctx, &genai.ClientConfig{
		Backend:  genai.BackendVertexAI,
		Project:  project,
		Location: location,
	})
	if err != nil {
		return nil, apperr.Infrastructure("failed to create Gemini client", err)
	}
	return c, nil
}

func geminiGenerateJSON(ctx context.Context, client *genai.Client, model, prompt string, schema *genai.Schema) (string, error) {
	parts := []*genai.Part{genai.NewPartFromText(prompt)}
	contents := []*genai.Content{genai.NewContentFromParts(parts, genai.RoleUser)}
	cfg := &genai.GenerateContentConfig{ResponseMIMEType: "application/json"}
	if schema != nil {
		cfg.ResponseSchema = schema
	}
	result, err := client.Models.GenerateContent(ctx, model, contents, cfg)
	if err != nil {
		return "", aiAssistFailed("Gemini discover request failed.")
	}
	text := strings.TrimSpace(result.Text())
	if text == "" {
		return "", aiAssistFailed("Gemini discover returned no text output.")
	}
	return text, nil
}

func aiAssistFailed(message string) error {
	return &apperr.AppError{Kind: apperr.KindInternal, Code: "AI_ASSIST_FAILED", Message: message}
}

// extractJSONText はLLM応答からJSON本体を取り出す（フェンス→最初の{〜最後の}→そのまま）。
func extractJSONText(text string) string {
	trimmed := strings.TrimSpace(text)
	if m := fencedJSONRe.FindStringSubmatch(trimmed); m != nil {
		return strings.TrimSpace(m[1])
	}
	first := strings.Index(trimmed, "{")
	last := strings.LastIndex(trimmed, "}")
	if first != -1 && last > first {
		return trimmed[first : last+1]
	}
	return trimmed
}

// --- Planner ---

type GeminiDiscoverAgentPlanner struct {
	client *genai.Client
	model  string
}

func NewGeminiDiscoverAgentPlanner(ctx context.Context, project, location, model string) (*GeminiDiscoverAgentPlanner, error) {
	client, err := newGeminiClient(ctx, project, location)
	if err != nil {
		return nil, err
	}
	return &GeminiDiscoverAgentPlanner{client: client, model: model}, nil
}

func (p *GeminiDiscoverAgentPlanner) PlanTool(ctx context.Context, in agentsapp.PlanDiscoverToolInput) (agentsapp.DiscoverToolPlan, error) {
	text, err := geminiGenerateJSON(ctx, p.client, p.model, buildPlannerPrompt(in), nil)
	if err != nil {
		return agentsapp.DiscoverToolPlan{}, err
	}
	var plan agentsapp.DiscoverToolPlan
	if err := json.Unmarshal([]byte(extractJSONText(text)), &plan); err != nil {
		return agentsapp.DiscoverToolPlan{}, aiAssistFailed("Gemini discover planner returned invalid tool plan.")
	}
	if plan.Arguments == nil {
		plan.Arguments = map[string]any{}
	}
	return plan, nil
}

// --- Responder ---

type GeminiDiscoverAgentResponder struct {
	client *genai.Client
	model  string
}

func NewGeminiDiscoverAgentResponder(ctx context.Context, project, location, model string) (*GeminiDiscoverAgentResponder, error) {
	client, err := newGeminiClient(ctx, project, location)
	if err != nil {
		return nil, err
	}
	return &GeminiDiscoverAgentResponder{client: client, model: model}, nil
}

func (r *GeminiDiscoverAgentResponder) BuildReply(ctx context.Context, in agentsapp.BuildDiscoverReplyInput) (agentsapp.BuildDiscoverReplyOutput, error) {
	schema := &genai.Schema{
		Type:       genai.TypeObject,
		Properties: map[string]*genai.Schema{"assistantMessage": {Type: genai.TypeString}},
		Required:   []string{"assistantMessage"},
	}
	text, err := geminiGenerateJSON(ctx, r.client, r.model, buildResponderPrompt(in), schema)
	if err != nil {
		return agentsapp.BuildDiscoverReplyOutput{}, err
	}
	var reply struct {
		AssistantMessage string `json:"assistantMessage"`
	}
	if err := json.Unmarshal([]byte(extractJSONText(text)), &reply); err != nil || strings.TrimSpace(reply.AssistantMessage) == "" {
		return agentsapp.BuildDiscoverReplyOutput{}, aiAssistFailed("Gemini discover agent returned invalid structured output.")
	}
	return agentsapp.BuildDiscoverReplyOutput{AssistantMessage: reply.AssistantMessage}, nil
}

var (
	_ agentsapp.DiscoverAgentPlanner   = (*GeminiDiscoverAgentPlanner)(nil)
	_ agentsapp.DiscoverAgentResponder = (*GeminiDiscoverAgentResponder)(nil)
)
