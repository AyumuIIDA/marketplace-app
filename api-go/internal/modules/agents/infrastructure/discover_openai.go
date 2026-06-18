package agentsinfra

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/openai/openai-go/responses"

	agentsapp "marketplace/api-go/internal/modules/agents/application"
	"marketplace/api-go/internal/shared/apperr"
)

// OpenAI(Responses API) 版 discover planner/responder。
// planner は自由形式の arguments を扱うため strict schema を使わずJSONをパースする。
// responder は assistantMessage だけの厳密schemaで構造化出力する。

func newOpenAiClient(apiKey string) (openai.Client, error) {
	if strings.TrimSpace(apiKey) == "" {
		return openai.Client{}, apperr.Infrastructure("OPENAI_API_KEY is not configured", nil)
	}
	return openai.NewClient(option.WithAPIKey(apiKey)), nil
}

func openaiGenerate(ctx context.Context, client openai.Client, params responses.ResponseNewParams) (string, error) {
	resp, err := client.Responses.New(ctx, params)
	if err != nil {
		return "", aiAssistFailed("OpenAI discover request failed.")
	}
	text := strings.TrimSpace(resp.OutputText())
	if text == "" {
		return "", aiAssistFailed("OpenAI discover returned no text output.")
	}
	return text, nil
}

// --- Planner ---

type OpenAiDiscoverAgentPlanner struct {
	client openai.Client
	model  string
}

func NewOpenAiDiscoverAgentPlanner(apiKey, model string) (*OpenAiDiscoverAgentPlanner, error) {
	client, err := newOpenAiClient(apiKey)
	if err != nil {
		return nil, err
	}
	return &OpenAiDiscoverAgentPlanner{client: client, model: model}, nil
}

func (p *OpenAiDiscoverAgentPlanner) PlanTool(ctx context.Context, in agentsapp.PlanDiscoverToolInput) (agentsapp.DiscoverToolPlan, error) {
	text, err := openaiGenerate(ctx, p.client, responses.ResponseNewParams{
		Model: p.model,
		Input: responses.ResponseNewParamsInputUnion{OfString: openai.String(buildPlannerPrompt(in))},
	})
	if err != nil {
		return agentsapp.DiscoverToolPlan{}, err
	}
	var plan agentsapp.DiscoverToolPlan
	if err := json.Unmarshal([]byte(extractJSONText(text)), &plan); err != nil {
		return agentsapp.DiscoverToolPlan{}, aiAssistFailed("OpenAI discover planner returned invalid tool plan.")
	}
	if plan.Arguments == nil {
		plan.Arguments = map[string]any{}
	}
	return plan, nil
}

// --- Responder ---

type OpenAiDiscoverAgentResponder struct {
	client openai.Client
	model  string
}

func NewOpenAiDiscoverAgentResponder(apiKey, model string) (*OpenAiDiscoverAgentResponder, error) {
	client, err := newOpenAiClient(apiKey)
	if err != nil {
		return nil, err
	}
	return &OpenAiDiscoverAgentResponder{client: client, model: model}, nil
}

func (r *OpenAiDiscoverAgentResponder) BuildReply(ctx context.Context, in agentsapp.BuildDiscoverReplyInput) (agentsapp.BuildDiscoverReplyOutput, error) {
	schema := map[string]any{
		"type":                 "object",
		"properties":           map[string]any{"assistantMessage": map[string]any{"type": "string"}},
		"required":             []string{"assistantMessage"},
		"additionalProperties": false,
	}
	text, err := openaiGenerate(ctx, r.client, responses.ResponseNewParams{
		Model: r.model,
		Input: responses.ResponseNewParamsInputUnion{OfString: openai.String(buildResponderPrompt(in))},
		Text: responses.ResponseTextConfigParam{
			Format: responses.ResponseFormatTextConfigParamOfJSONSchema("discover_agent_reply", schema),
		},
	})
	if err != nil {
		return agentsapp.BuildDiscoverReplyOutput{}, err
	}
	var reply struct {
		AssistantMessage string `json:"assistantMessage"`
	}
	if err := json.Unmarshal([]byte(extractJSONText(text)), &reply); err != nil || strings.TrimSpace(reply.AssistantMessage) == "" {
		return agentsapp.BuildDiscoverReplyOutput{}, aiAssistFailed("OpenAI discover agent returned invalid structured output.")
	}
	return agentsapp.BuildDiscoverReplyOutput{AssistantMessage: reply.AssistantMessage}, nil
}

var (
	_ agentsapp.DiscoverAgentPlanner   = (*OpenAiDiscoverAgentPlanner)(nil)
	_ agentsapp.DiscoverAgentResponder = (*OpenAiDiscoverAgentResponder)(nil)
)
