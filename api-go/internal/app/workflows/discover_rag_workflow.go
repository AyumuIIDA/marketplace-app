package workflows

import (
	"context"

	"github.com/google/uuid"

	agentsapp "marketplace/api-go/internal/modules/agents/application"
	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
)

// DiscoverRagResult は単段RAG（取得→生成）の応答。items は根拠となった候補（フロント互換の検索結果形）。
type DiscoverRagResult struct {
	AssistantMessage string          `json:"assistantMessage"`
	Items            []ScoredListing `json:"items"`
}

// DiscoverRagWorkflow は「意味検索で候補取得 → LLMで根拠付き回答生成」の単段RAG。
// retrieval=SemanticSearchWorkflow(VectorIndex＋hydrate)、generation=DiscoverAgentResponder を再利用し、
// 多段ツールループ無しで堅牢・低コスト・多言語（埋め込みが横断ヒット）にする。
type DiscoverRagWorkflow struct {
	search   *SemanticSearchWorkflow
	registry *agentsapp.DiscoverAgentRegistry
}

func NewDiscoverRagWorkflow(search *SemanticSearchWorkflow, registry *agentsapp.DiscoverAgentRegistry) *DiscoverRagWorkflow {
	return &DiscoverRagWorkflow{search: search, registry: registry}
}

// 取得は多めに行い、表示はLLMが選別する（CLIPノイズ/データ偏りの除去）。
const discoverRagTopK = 16

// Execute は query を意味検索し、取得候補のみを文脈に LLM で回答を生成する（grounding）。
func (w *DiscoverRagWorkflow) Execute(ctx context.Context, query, provider string, requesterID uuid.UUID) (DiscoverRagResult, error) {
	published := "PUBLISHED"
	rid := requesterID
	retrieved, err := w.search.Execute(ctx, query,
		recommendationapp.SearchFilter{Status: &published}, discoverRagTopK, &rid)
	if err != nil {
		return DiscoverRagResult{}, err
	}

	candidates := make([]agentsapp.DiscoverListing, 0, len(retrieved.Items))
	for _, it := range retrieved.Items {
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
	byID := make(map[string]ScoredListing, len(retrieved.Items))
	for _, it := range retrieved.Items {
		byID[it.ListingID] = it
	}
	items := make([]ScoredListing, 0, len(reply.ListingIDs))
	for _, id := range reply.ListingIDs {
		if it, ok := byID[id]; ok {
			items = append(items, it)
		}
	}

	return DiscoverRagResult{AssistantMessage: reply.AssistantMessage, Items: items}, nil
}
