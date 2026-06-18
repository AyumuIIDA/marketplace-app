package workflows

import (
	"context"

	"github.com/google/uuid"

	listingsapp "marketplace/api-go/internal/modules/listings/application"
	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
)

// ListingLookup は出品IDから応答ビューを得る関数（listings module の GetListingUseCase.Execute を渡す）。
// recommendation の検索結果を本体情報へhydrateするための合成境界。
type ListingLookup func(ctx context.Context, id uuid.UUID, requesterID *uuid.UUID) (listingsapp.ListingView, error)

// ScoredListing は出品ビューにベクトル検索スコアを添えた応答要素。
type ScoredListing struct {
	listingsapp.ListingView
	Score float32 `json:"score"`
}

// SemanticSearchResult は意味検索/類似の応答（既存フロント互換の items 形）。
type SemanticSearchResult struct {
	Items []ScoredListing `json:"items"`
}

// SemanticSearchWorkflow は recommendation(ベクトル) と listings(本体) をまたぐ読み取り合成。
// vector側で近傍ID列を得て、listings側で本体をhydrateする。
type SemanticSearchWorkflow struct {
	index  recommendationapp.VectorIndex
	lookup ListingLookup
}

// NewSemanticSearchWorkflow は意味検索workflowを構築する。
func NewSemanticSearchWorkflow(index recommendationapp.VectorIndex, lookup ListingLookup) *SemanticSearchWorkflow {
	return &SemanticSearchWorkflow{index: index, lookup: lookup}
}

// Execute は自然文クエリで近傍を検索し、本体をhydrateして返す。
func (w *SemanticSearchWorkflow) Execute(ctx context.Context, query string, filter recommendationapp.SearchFilter, topK int32, requesterID *uuid.UUID) (SemanticSearchResult, error) {
	hits, err := w.index.SearchByText(ctx, query, topK, filter)
	if err != nil {
		return SemanticSearchResult{}, err
	}
	return SemanticSearchResult{Items: hydrate(ctx, hits, requesterID, w.lookup)}, nil
}

// SimilarListingsWorkflow は1出品に視覚的に近い出品を返す（画像→画像）。
type SimilarListingsWorkflow struct {
	index  recommendationapp.VectorIndex
	lookup ListingLookup
}

// NewSimilarListingsWorkflow は類似商品workflowを構築する。
func NewSimilarListingsWorkflow(index recommendationapp.VectorIndex, lookup ListingLookup) *SimilarListingsWorkflow {
	return &SimilarListingsWorkflow{index: index, lookup: lookup}
}

// Execute は対象出品自身を除外して近傍を返す。
func (w *SimilarListingsWorkflow) Execute(ctx context.Context, listingID uuid.UUID, topK int32, requesterID *uuid.UUID) (SemanticSearchResult, error) {
	published := "PUBLISHED"
	hits, err := w.index.SimilarItems(ctx, listingID.String(), topK, recommendationapp.SearchFilter{
		Status:           &published,
		ExcludeListingID: listingID.String(),
	})
	if err != nil {
		return SemanticSearchResult{}, err
	}
	return SemanticSearchResult{Items: hydrate(ctx, hits, requesterID, w.lookup)}, nil
}

// hydrate は近傍ID列をスコア順を保ったまま本体へ写す。
// 取得できない要素（非UUID/不在/非公開=ベクトルの読み取りモデル遅延）は静かに除外する。
func hydrate(ctx context.Context, hits []recommendationapp.SearchHit, requesterID *uuid.UUID, lookup ListingLookup) []ScoredListing {
	items := make([]ScoredListing, 0, len(hits))
	for _, h := range hits {
		id, err := uuid.Parse(h.ListingID)
		if err != nil {
			continue
		}
		view, err := lookup(ctx, id, requesterID)
		if err != nil {
			// NotFound/Forbidden(下書き・SOLD・HIDDEN) はベクトル側の鮮度ずれ。結果から落とす。
			continue
		}
		items = append(items, ScoredListing{ListingView: view, Score: h.Score})
	}
	return items
}
