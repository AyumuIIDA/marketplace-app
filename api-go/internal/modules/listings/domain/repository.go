package listingsdomain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// IsSearchable は一般検索・閲覧に出せる状態か（PUBLISHEDのみ）。
func IsSearchable(l *Listing) bool { return l.status == ListingStatusPublished }

// IsPurchasable は購入可能な状態か（PUBLISHEDのみ）。
func IsPurchasable(l *Listing) bool { return l.status == ListingStatusPublished }

// CanSellerMutate は出品者がこの出品を変更(publish/update)できるか。
// 売り手本人かつ SOLD/HIDDEN でないこと。
func CanSellerMutate(l *Listing, sellerID uuid.UUID) bool {
	return l.sellerID == sellerID && l.status != ListingStatusSold && l.status != ListingStatusHidden
}

// SearchInput は有界(7フィルタ)の検索条件。各フィールドはnilで無効。
type SearchInput struct {
	Keyword   *string
	Category  *string
	Condition *string
	MinPrice  *int32
	MaxPrice  *int32
	Status    *ListingStatus
	SellerID  *uuid.UUID
	Limit     *int32
	Offset    *int32
}

// ImageToSave は listing_images への保存入力（hashはcontent-addressed keyに必要）。
type ImageToSave struct {
	URL       string
	Hash      string
	SortOrder int32
}

// SaveImagesInput は出品への画像添付入力。
type SaveImagesInput struct {
	ListingID uuid.UUID
	Images    []ImageToSave
}

// ClaimForPurchaseInput は購入のための原子的claim入力。
type ClaimForPurchaseInput struct {
	ListingID uuid.UUID
	BuyerID   uuid.UUID
	SoldAt    time.Time
}

// ListingRepository は出品の永続化port。見つからない場合は (nil, nil)。
type ListingRepository interface {
	Save(ctx context.Context, listing *Listing) error
	SaveImages(ctx context.Context, in SaveImagesInput) error
	FindByID(ctx context.Context, id uuid.UUID) (*Listing, error)
	// FindByIDs は指定idの出品をまとめて取得する（順序は未規定。呼び出し側で復元）。
	FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*Listing, error)
	Search(ctx context.Context, in SearchInput) ([]*Listing, error)
	// ClaimForPurchase は公開中かつ売り手≠買い手の出品を原子的にSOLDへ遷移する。
	// claimできなければ (nil, nil)（競合/不可）。
	ClaimForPurchase(ctx context.Context, in ClaimForPurchaseInput) (*Listing, error)
}
