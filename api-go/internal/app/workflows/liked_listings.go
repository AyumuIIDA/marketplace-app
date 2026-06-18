package workflows

import (
	"context"

	"github.com/google/uuid"

	listingsapp "github.com/outarc/marketplace/api-go/internal/modules/listings/application"
)

// LikedListingIDs はユーザのいいねした商品IDを新着順で返す関数
// （social の ListLikedListingIDsUseCase.Execute を渡す）。
type LikedListingIDs func(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]uuid.UUID, error)

// ListingsByIDs はID列から出品ビューを入力順で返す関数
// （listings の ListListingsByIDsUseCase.Execute を渡す）。
type ListingsByIDs func(ctx context.Context, ids []uuid.UUID) ([]listingsapp.ListingView, error)

// LikedListingsResult はいいねした商品一覧の応答（既存フロント互換の items 形）。
type LikedListingsResult struct {
	Items []listingsapp.ListingView `json:"items"`
}

// LikedListingsWorkflow は social(いいねID) と listings(本体) をまたぐ読み取り合成。
// いいねIDを新着順で得て、listings側で本体をhydrateする。
type LikedListingsWorkflow struct {
	likedIDs LikedListingIDs
	byIDs    ListingsByIDs
}

// NewLikedListingsWorkflow はいいね商品一覧workflowを構築する。
func NewLikedListingsWorkflow(likedIDs LikedListingIDs, byIDs ListingsByIDs) *LikedListingsWorkflow {
	return &LikedListingsWorkflow{likedIDs: likedIDs, byIDs: byIDs}
}

// Execute はいいね商品IDをページングで取得し、本体をhydrateして同順で返す。
func (w *LikedListingsWorkflow) Execute(ctx context.Context, userID uuid.UUID, limit, offset int32) (LikedListingsResult, error) {
	ids, err := w.likedIDs(ctx, userID, limit, offset)
	if err != nil {
		return LikedListingsResult{}, err
	}
	views, err := w.byIDs(ctx, ids)
	if err != nil {
		return LikedListingsResult{}, err
	}
	return LikedListingsResult{Items: views}, nil
}
