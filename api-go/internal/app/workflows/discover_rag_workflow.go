package workflows

import (
	"context"

	"github.com/google/uuid"

	agentsapp "marketplace/api-go/internal/modules/agents/application"
	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
)

// 取得経路。意味検索が空（基盤障害でも該当なしでも戻り値は同一）のときフォールバックへ。
const (
	retrievalSemantic = "semantic"
	retrievalKeyword  = "keyword"
)

// DiscoverRagResult は単段RAG（取得→生成）の応答。items は根拠となった候補（フロント互換の検索結果形）。
// retrievalMode は実際に使った取得経路（semantic / keyword）。手順表示を事実と一致させるために返す。
type DiscoverRagResult struct {
	AssistantMessage string          `json:"assistantMessage"`
	Items            []ScoredListing `json:"items"`
	RetrievalMode    string          `json:"retrievalMode"`
}

// AgentSearch は意味検索が空のときのフォールバック先（実証済みの多段エージェント検索）。
// *RunDiscoverAgentWorkflow が構造的に満たす。plan→keyword検索→反復→応答 を1ターンで行う。
type AgentSearch interface {
	Execute(ctx context.Context, in RunDiscoverAgentInput) (RunDiscoverAgentResult, error)
}

// DiscoverRagWorkflow は「意味検索で候補取得 → LLMで根拠付き回答生成」の単段RAG。
// retrieval=SemanticSearchWorkflow(VectorIndex＋hydrate)、generation=DiscoverAgentResponder を再利用する。
// 意味検索が空のときは、keyword(Postgres) ベースで実績のある多段エージェント検索へターンごと委譲する
// （単一語ILIKE＋最大3手の反復で堅牢。vector 基盤に依存しないので障害時も検索を止めない）。
type DiscoverRagWorkflow struct {
	search   *SemanticSearchWorkflow
	registry *agentsapp.DiscoverAgentRegistry
	agent    AgentSearch
}

func NewDiscoverRagWorkflow(search *SemanticSearchWorkflow, registry *agentsapp.DiscoverAgentRegistry) *DiscoverRagWorkflow {
	return &DiscoverRagWorkflow{search: search, registry: registry}
}

// WithAgentFallback は意味検索が空のときのフォールバック（エージェント検索）を注入する。
// 未注入なら意味検索のみ（空はそのまま空を返す）。
func (w *DiscoverRagWorkflow) WithAgentFallback(agent AgentSearch) *DiscoverRagWorkflow {
	w.agent = agent
	return w
}

// 取得は多めに行い、表示はLLMが選別する（CLIPノイズ/データ偏りの除去）。
const discoverRagTopK = 16

// Execute は query を意味検索し、取得候補のみを文脈に LLM で回答を生成する（grounding）。
// 意味検索が空ならエージェント検索へ委譲する。
func (w *DiscoverRagWorkflow) Execute(ctx context.Context, query, provider string, requesterID uuid.UUID) (DiscoverRagResult, error) {
	published := "PUBLISHED"
	rid := requesterID
	semantic, err := w.search.Execute(ctx, query,
		recommendationapp.SearchFilter{Status: &published}, discoverRagTopK, &rid)
	if err != nil {
		return DiscoverRagResult{}, err
	}

	// 意味検索が空 → 実証済みエージェント検索へ委譲（plan→keyword→反復→応答）。
	if len(semantic.Items) == 0 {
		return w.agentFallback(ctx, query, provider, requesterID)
	}

	// 意味検索ヒット → 取得候補を文脈に RAG responder で根拠付き回答を生成する。
	candidates := make([]agentsapp.DiscoverListing, 0, len(semantic.Items))
	for _, it := range semantic.Items {
		candidates = append(candidates, agentsapp.DiscoverListing{
			ListingID: it.ListingID,
			Title:     it.Title,
			Price:     it.Price,
			Currency:  it.Currency,
			Category:  it.Category,
			Condition: it.Condition,
			Signed:    it.SignatureID != nil,
			Status:    it.Status,
		})
	}

	agent := w.registry.Resolve(provider)
	reply, err := agent.Responder.BuildReply(ctx, agentsapp.BuildDiscoverReplyInput{
		UserMessage: query,
		Listings:    candidates,
	})
	if err != nil {
		return DiscoverRagResult{}, err
	}

	// 表示タイルはLLMが選んだ listingId のみ・関連順（取得候補からの部分集合）。
	byID := make(map[string]ScoredListing, len(semantic.Items))
	for _, it := range semantic.Items {
		byID[it.ListingID] = it
	}
	items := make([]ScoredListing, 0, len(reply.ListingIDs))
	for _, id := range reply.ListingIDs {
		if it, ok := byID[id]; ok {
			items = append(items, it)
		}
	}

	return DiscoverRagResult{AssistantMessage: reply.AssistantMessage, Items: items, RetrievalMode: retrievalSemantic}, nil
}

// agentFallback は意味検索が空のとき、実証済みの多段エージェント検索へターンごと委譲する。
// エージェントが retrieval（keyword）も応答生成も行うため、RAG responder は呼ばない。
func (w *DiscoverRagWorkflow) agentFallback(ctx context.Context, query, provider string, requesterID uuid.UUID) (DiscoverRagResult, error) {
	if w.agent == nil {
		// フォールバック未注入＝意味検索のみ。空をそのまま返す。
		return DiscoverRagResult{RetrievalMode: retrievalKeyword}, nil
	}
	out, err := w.agent.Execute(ctx, RunDiscoverAgentInput{
		UserID:   requesterID.String(),
		Message:  query,
		Provider: provider,
	})
	if err != nil {
		return DiscoverRagResult{}, err
	}
	items := make([]ScoredListing, 0, len(out.Listings))
	for _, lv := range out.Listings {
		// keyword一致は vector 距離を持たない。score=0 で正直に表す。
		items = append(items, ScoredListing{ListingView: lv, Score: 0})
	}
	return DiscoverRagResult{AssistantMessage: out.AssistantMessage, Items: items, RetrievalMode: retrievalKeyword}, nil
}
