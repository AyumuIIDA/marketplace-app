package socialapp

import (
	"context"

	"github.com/google/uuid"

	socialdomain "marketplace/api-go/internal/modules/social/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/clock"
	"marketplace/api-go/internal/shared/ids"
)

// --- ListingLike（商品いいね） ---

// ListingLikeUseCase は商品いいねのトグル（like/unlike）を担う。冪等（PKで二重防止）。
type ListingLikeUseCase struct {
	repo Repository
}

func NewListingLikeUseCase(r Repository) *ListingLikeUseCase {
	return &ListingLikeUseCase{repo: r}
}

func (uc *ListingLikeUseCase) Like(ctx context.Context, userID, listingID uuid.UUID) (LikeStatusView, error) {
	if err := uc.repo.LikeListing(ctx, userID, listingID); err != nil {
		return LikeStatusView{}, err
	}
	return uc.status(ctx, listingID, true)
}

func (uc *ListingLikeUseCase) Unlike(ctx context.Context, userID, listingID uuid.UUID) (LikeStatusView, error) {
	if err := uc.repo.UnlikeListing(ctx, userID, listingID); err != nil {
		return LikeStatusView{}, err
	}
	return uc.status(ctx, listingID, false)
}

func (uc *ListingLikeUseCase) status(ctx context.Context, listingID uuid.UUID, liked bool) (LikeStatusView, error) {
	count, err := uc.repo.CountListingLikes(ctx, listingID)
	if err != nil {
		return LikeStatusView{}, err
	}
	return LikeStatusView{LikeCount: count, LikedByMe: liked}, nil
}

// --- SellerLike（出品者いいね） ---

// SellerLikeUseCase は出品者いいねのトグルを担う。自己いいねは拒否する。
type SellerLikeUseCase struct {
	repo Repository
}

func NewSellerLikeUseCase(r Repository) *SellerLikeUseCase {
	return &SellerLikeUseCase{repo: r}
}

func (uc *SellerLikeUseCase) Like(ctx context.Context, userID, sellerID uuid.UUID) (LikeStatusView, error) {
	if err := socialdomain.EnsureCanLikeSeller(userID, sellerID); err != nil {
		return LikeStatusView{}, err
	}
	if err := uc.repo.LikeSeller(ctx, userID, sellerID); err != nil {
		return LikeStatusView{}, err
	}
	return uc.status(ctx, sellerID, true)
}

func (uc *SellerLikeUseCase) Unlike(ctx context.Context, userID, sellerID uuid.UUID) (LikeStatusView, error) {
	if err := uc.repo.UnlikeSeller(ctx, userID, sellerID); err != nil {
		return LikeStatusView{}, err
	}
	return uc.status(ctx, sellerID, false)
}

func (uc *SellerLikeUseCase) status(ctx context.Context, sellerID uuid.UUID, liked bool) (LikeStatusView, error) {
	count, err := uc.repo.CountSellerLikes(ctx, sellerID)
	if err != nil {
		return LikeStatusView{}, err
	}
	return LikeStatusView{LikeCount: count, LikedByMe: liked}, nil
}

// --- GetSellerSummary（出品者表示UI） ---

// GetSellerSummaryUseCase は出品者の表示情報・評価・いいねを合成して返す。
type GetSellerSummaryUseCase struct {
	repo Repository
}

func NewGetSellerSummaryUseCase(r Repository) *GetSellerSummaryUseCase {
	return &GetSellerSummaryUseCase{repo: r}
}

// Execute は出品者サマリを返す。viewerID が非nilのとき likedByMe を解決する。
func (uc *GetSellerSummaryUseCase) Execute(ctx context.Context, sellerID uuid.UUID, viewerID *uuid.UUID) (SellerSummaryView, error) {
	profile, err := uc.repo.FindSellerProfile(ctx, sellerID)
	if err != nil {
		return SellerSummaryView{}, err
	}
	if profile == nil {
		return SellerSummaryView{}, apperr.NotFound("Seller", sellerID.String())
	}
	rating, err := uc.repo.GetSellerRating(ctx, sellerID)
	if err != nil {
		return SellerSummaryView{}, err
	}
	likeCount, err := uc.repo.CountSellerLikes(ctx, sellerID)
	if err != nil {
		return SellerSummaryView{}, err
	}
	likedByMe := false
	if viewerID != nil {
		likedByMe, err = uc.repo.IsSellerLiked(ctx, *viewerID, sellerID)
		if err != nil {
			return SellerSummaryView{}, err
		}
	}
	return SellerSummaryView{
		SellerID:      sellerID.String(),
		Handle:        handleFromID(sellerID),
		DisplayName:   profile.DisplayName,
		AvatarURL:     profile.AvatarURL,
		HumanVerified: profile.HumanVerified,
		Rating:        rating.Average,
		ReviewCount:   rating.Count,
		LikeCount:     likeCount,
		LikedByMe:     likedByMe,
	}, nil
}

// --- ListLikedListingIDs（いいねした商品ID） ---
// hydrate(本体出品の取得)は app/workflows で listings と合成する（読み取り合成境界）。

type ListLikedListingIDsUseCase struct {
	repo Repository
}

func NewListLikedListingIDsUseCase(r Repository) *ListLikedListingIDsUseCase {
	return &ListLikedListingIDsUseCase{repo: r}
}

func (uc *ListLikedListingIDsUseCase) Execute(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]uuid.UUID, error) {
	return uc.repo.ListLikedListingIDs(ctx, userID, limit, offset)
}

// --- ListLikedSellers（いいねした出品者一覧） ---

type LikedSellersResult struct {
	Items []SellerSummaryView `json:"items"`
}

type ListLikedSellersUseCase struct {
	repo    Repository
	summary *GetSellerSummaryUseCase
}

func NewListLikedSellersUseCase(r Repository, summary *GetSellerSummaryUseCase) *ListLikedSellersUseCase {
	return &ListLikedSellersUseCase{repo: r, summary: summary}
}

// Execute はいいねした出品者をサマリ付きで新着順に返す。viewer は本人なので likedByMe=true。
func (uc *ListLikedSellersUseCase) Execute(ctx context.Context, userID uuid.UUID, limit, offset int32) (LikedSellersResult, error) {
	ids, err := uc.repo.ListLikedSellerIDs(ctx, userID, limit, offset)
	if err != nil {
		return LikedSellersResult{}, err
	}
	items := make([]SellerSummaryView, 0, len(ids))
	for _, id := range ids {
		view, err := uc.summary.Execute(ctx, id, &userID)
		if err != nil {
			// 出品者が削除済み等で解決できない要素は静かに除外する。
			if apperr.IsNotFound(err) {
				continue
			}
			return LikedSellersResult{}, err
		}
		items = append(items, view)
	}
	return LikedSellersResult{Items: items}, nil
}

// --- ListingComment（出品コメント） ---

// CreateListingCommentUseCase は出品コメント投稿を担う。投稿者は人間性検証済みのみ許可する。
type CreateListingCommentUseCase struct {
	repo  Repository
	ids   ids.Generator
	clock clock.Clock
}

func NewCreateListingCommentUseCase(r Repository, g ids.Generator, c clock.Clock) *CreateListingCommentUseCase {
	return &CreateListingCommentUseCase{repo: r, ids: g, clock: c}
}

func (uc *CreateListingCommentUseCase) Execute(ctx context.Context, listingID, authorID uuid.UUID, body string) (CommentView, error) {
	// 著者の表示情報を取得しつつ人間性検証をゲートする（未認証はコメント不可）。
	author, err := uc.repo.FindSellerProfile(ctx, authorID)
	if err != nil {
		return CommentView{}, err
	}
	if author == nil {
		return CommentView{}, apperr.NotFound("User", authorID.String())
	}
	if !author.HumanVerified {
		return CommentView{}, apperr.Forbidden("Only human-verified users can comment.")
	}

	now := uc.clock.Now()
	comment, err := socialdomain.NewComment(uc.ids.NewID(), listingID, authorID, body, now)
	if err != nil {
		return CommentView{}, err
	}
	if err := uc.repo.SaveComment(ctx, comment); err != nil {
		return CommentView{}, err
	}

	return CommentView{
		CommentID:           comment.ID().String(),
		ListingID:           comment.ListingID().String(),
		AuthorID:            comment.AuthorID().String(),
		AuthorDisplayName:   author.DisplayName,
		AuthorHumanVerified: author.HumanVerified,
		Body:                comment.Body(),
		CreatedAt:           comment.CreatedAt(),
	}, nil
}

// ListListingCommentsUseCase は出品コメントを新着順に返す。
type ListListingCommentsUseCase struct {
	repo Repository
}

func NewListListingCommentsUseCase(r Repository) *ListListingCommentsUseCase {
	return &ListListingCommentsUseCase{repo: r}
}

func (uc *ListListingCommentsUseCase) Execute(ctx context.Context, listingID uuid.UUID, limit, offset int32) (CommentsView, error) {
	rows, err := uc.repo.ListComments(ctx, listingID, limit, offset)
	if err != nil {
		return CommentsView{}, err
	}
	items := make([]CommentView, 0, len(rows))
	for _, row := range rows {
		items = append(items, presentComment(row))
	}
	return CommentsView{Items: items}, nil
}
