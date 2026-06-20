package socialapp

import (
	"context"

	"github.com/google/uuid"

	socialdomain "marketplace/api-go/internal/modules/social/domain"
	"marketplace/api-go/internal/shared/apperr"
)

// 私的レイヤー（保存/フォロー）。公開シグナルの「いいね」と異なり World ID 認証は要求しない
// （全ログインユーザー可）。ランキング/評判に影響しない私的ブックマーク/フォロー。

// --- SaveListing（商品の保存） ---

// SaveListingUseCase は商品保存のトグル（save/unsave）を担う。冪等。
type SaveListingUseCase struct {
	repo Repository
}

func NewSaveListingUseCase(r Repository) *SaveListingUseCase {
	return &SaveListingUseCase{repo: r}
}

func (uc *SaveListingUseCase) Save(ctx context.Context, userID, listingID uuid.UUID) (SaveStatusView, error) {
	if err := uc.repo.SaveListing(ctx, userID, listingID); err != nil {
		return SaveStatusView{}, err
	}
	return SaveStatusView{SavedByMe: true}, nil
}

func (uc *SaveListingUseCase) Unsave(ctx context.Context, userID, listingID uuid.UUID) (SaveStatusView, error) {
	if err := uc.repo.UnsaveListing(ctx, userID, listingID); err != nil {
		return SaveStatusView{}, err
	}
	return SaveStatusView{SavedByMe: false}, nil
}

// --- ListSavedListingIDs（保存した商品ID） ---
// hydrate は app/workflows で listings と合成する（いいね一覧と同方式）。

type ListSavedListingIDsUseCase struct {
	repo Repository
}

func NewListSavedListingIDsUseCase(r Repository) *ListSavedListingIDsUseCase {
	return &ListSavedListingIDsUseCase{repo: r}
}

func (uc *ListSavedListingIDsUseCase) Execute(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]uuid.UUID, error) {
	return uc.repo.ListSavedListingIDs(ctx, userID, limit, offset)
}

// --- FollowSeller（出品者のフォロー） ---

// FollowSellerUseCase は出品者フォローのトグルを担う。自己フォローは拒否する。
type FollowSellerUseCase struct {
	repo Repository
}

func NewFollowSellerUseCase(r Repository) *FollowSellerUseCase {
	return &FollowSellerUseCase{repo: r}
}

func (uc *FollowSellerUseCase) Follow(ctx context.Context, userID, sellerID uuid.UUID) (FollowStatusView, error) {
	if err := socialdomain.EnsureCanFollowSeller(userID, sellerID); err != nil {
		return FollowStatusView{}, err
	}
	if err := uc.repo.FollowSeller(ctx, userID, sellerID); err != nil {
		return FollowStatusView{}, err
	}
	return FollowStatusView{FollowingByMe: true}, nil
}

func (uc *FollowSellerUseCase) Unfollow(ctx context.Context, userID, sellerID uuid.UUID) (FollowStatusView, error) {
	if err := uc.repo.UnfollowSeller(ctx, userID, sellerID); err != nil {
		return FollowStatusView{}, err
	}
	return FollowStatusView{FollowingByMe: false}, nil
}

// --- ListFollowedSellers（フォロー中の出品者一覧） ---

type FollowedSellersResult struct {
	Items []SellerSummaryView `json:"items"`
}

type ListFollowedSellersUseCase struct {
	repo    Repository
	summary *GetSellerSummaryUseCase
}

func NewListFollowedSellersUseCase(r Repository, summary *GetSellerSummaryUseCase) *ListFollowedSellersUseCase {
	return &ListFollowedSellersUseCase{repo: r, summary: summary}
}

// Execute はフォロー中の出品者をサマリ付きで新着順に返す（viewer は本人＝followingByMe=true）。
func (uc *ListFollowedSellersUseCase) Execute(ctx context.Context, userID uuid.UUID, limit, offset int32) (FollowedSellersResult, error) {
	ids, err := uc.repo.ListFollowedSellerIDs(ctx, userID, limit, offset)
	if err != nil {
		return FollowedSellersResult{}, err
	}
	items := make([]SellerSummaryView, 0, len(ids))
	for _, id := range ids {
		view, err := uc.summary.Execute(ctx, id, &userID)
		if err != nil {
			if apperr.IsNotFound(err) {
				continue
			}
			return FollowedSellersResult{}, err
		}
		items = append(items, view)
	}
	return FollowedSellersResult{Items: items}, nil
}
