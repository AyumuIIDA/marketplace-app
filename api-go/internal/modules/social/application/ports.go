// Package socialapp は いいね / 出品者サマリ のUseCaseを実装する。
package socialapp

import (
	"context"

	"github.com/google/uuid"
)

// SellerProfile は出品者の表示情報（users 由来の読み取りモデル）。
type SellerProfile struct {
	DisplayName   string
	AvatarURL     *string
	HumanVerified bool
}

// SellerRating は出品者の評価集計（SUBMITTED reviews 由来）。
// Average は評価0件のとき nil（UIは「評価なし」を表示）。
type SellerRating struct {
	Average *float64
	Count   int64
}

// Repository は いいね（商品/出品者）と出品者読み取りモデルの永続化port。
// 見つからない場合は (nil, nil)。tx境界は持たず、注入されたDBTXで実行する。
type Repository interface {
	LikeListing(ctx context.Context, userID, listingID uuid.UUID) error
	UnlikeListing(ctx context.Context, userID, listingID uuid.UUID) error
	CountListingLikes(ctx context.Context, listingID uuid.UUID) (int64, error)
	IsListingLiked(ctx context.Context, userID, listingID uuid.UUID) (bool, error)
	ListLikedListingIDs(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]uuid.UUID, error)

	LikeSeller(ctx context.Context, userID, sellerID uuid.UUID) error
	UnlikeSeller(ctx context.Context, userID, sellerID uuid.UUID) error
	CountSellerLikes(ctx context.Context, sellerID uuid.UUID) (int64, error)
	IsSellerLiked(ctx context.Context, userID, sellerID uuid.UUID) (bool, error)
	ListLikedSellerIDs(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]uuid.UUID, error)

	// FindSellerProfile は出品者の表示情報を返す。存在しなければ (nil, nil)。
	FindSellerProfile(ctx context.Context, sellerID uuid.UUID) (*SellerProfile, error)
	// GetSellerRating は SUBMITTED reviews の平均評価と件数を返す。
	GetSellerRating(ctx context.Context, sellerID uuid.UUID) (SellerRating, error)
}
