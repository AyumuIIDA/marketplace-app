package agentsinfra

import (
	"context"
	"log/slog"

	agentsapp "marketplace/api-go/internal/modules/agents/application"
)

// 実リクエスト時の縮退デコレータ。
// gemini/openai クライアントは構築時に認証/モデルを検証しないため、PlanTool/BuildReply の
// 実呼び出しで初めて失敗する（ADC無し・モデル不正・レート制限・到達不能）。その失敗を
// deterministic へ縮退させ、AI検索が500で落ちずに必ず応答するようにする構造的フォールバック。

// FallbackDiscoverAgentPlanner は primary 失敗時に fallback(決定論) で計画する。
type FallbackDiscoverAgentPlanner struct {
	provider string
	primary  agentsapp.DiscoverAgentPlanner
	fallback agentsapp.DiscoverAgentPlanner
}

// NewFallbackDiscoverAgentPlanner は縮退付き planner を構築する。
func NewFallbackDiscoverAgentPlanner(provider string, primary, fallback agentsapp.DiscoverAgentPlanner) *FallbackDiscoverAgentPlanner {
	return &FallbackDiscoverAgentPlanner{provider: provider, primary: primary, fallback: fallback}
}

func (p *FallbackDiscoverAgentPlanner) PlanTool(ctx context.Context, in agentsapp.PlanDiscoverToolInput) (agentsapp.DiscoverToolPlan, error) {
	plan, err := p.primary.PlanTool(ctx, in)
	if err != nil {
		slog.Warn("discover planner failed; falling back to deterministic",
			slog.String("provider", p.provider), slog.String("error", err.Error()))
		return p.fallback.PlanTool(ctx, in)
	}
	return plan, nil
}

// FallbackDiscoverAgentResponder は primary 失敗時に fallback(決定論) で返答する。
type FallbackDiscoverAgentResponder struct {
	provider string
	primary  agentsapp.DiscoverAgentResponder
	fallback agentsapp.DiscoverAgentResponder
}

// NewFallbackDiscoverAgentResponder は縮退付き responder を構築する。
func NewFallbackDiscoverAgentResponder(provider string, primary, fallback agentsapp.DiscoverAgentResponder) *FallbackDiscoverAgentResponder {
	return &FallbackDiscoverAgentResponder{provider: provider, primary: primary, fallback: fallback}
}

func (r *FallbackDiscoverAgentResponder) BuildReply(ctx context.Context, in agentsapp.BuildDiscoverReplyInput) (agentsapp.BuildDiscoverReplyOutput, error) {
	out, err := r.primary.BuildReply(ctx, in)
	if err != nil {
		slog.Warn("discover responder failed; falling back to deterministic",
			slog.String("provider", r.provider), slog.String("error", err.Error()))
		return r.fallback.BuildReply(ctx, in)
	}
	return out, nil
}

var (
	_ agentsapp.DiscoverAgentPlanner   = (*FallbackDiscoverAgentPlanner)(nil)
	_ agentsapp.DiscoverAgentResponder = (*FallbackDiscoverAgentResponder)(nil)
)
