package listingsapp

import (
	"context"
	"time"

	"github.com/google/uuid"

	listingsdomain "github.com/outarc/marketplace/api-go/internal/modules/listings/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// ListingPurchaseService は購入のための出品claim/可否判定の業務手続き。
// repository は呼び出し側（workflowのtx-bound repo）から受け取り、tx境界を持たない。
type ListingPurchaseService struct{}

func NewListingPurchaseService() ListingPurchaseService { return ListingPurchaseService{} }

// GetPurchasableListing は購入可能性を検証して出品を返す。
func (ListingPurchaseService) GetPurchasableListing(ctx context.Context, repo listingsdomain.ListingRepository, listingID, buyerID uuid.UUID) (*listingsdomain.Listing, error) {
	listing, err := repo.FindByID(ctx, listingID)
	if err != nil {
		return nil, err
	}
	if listing == nil {
		return nil, apperr.NotFound("Listing", listingID.String())
	}
	if listing.SellerID() == buyerID {
		return nil, apperr.Forbidden("Seller cannot purchase their own listing.")
	}
	if !listingsdomain.IsPurchasable(listing) {
		return nil, apperr.Forbidden("Listing is not purchasable.")
	}
	return listing, nil
}

// ClaimForPurchase は原子的claimを試み、できなければ理由を判定して適切なエラーを返す。
func (s ListingPurchaseService) ClaimForPurchase(ctx context.Context, repo listingsdomain.ListingRepository, listingID, buyerID uuid.UUID, soldAt time.Time) (*listingsdomain.Listing, error) {
	claimed, err := repo.ClaimForPurchase(ctx, listingsdomain.ClaimForPurchaseInput{
		ListingID: listingID,
		BuyerID:   buyerID,
		SoldAt:    soldAt,
	})
	if err != nil {
		return nil, err
	}
	if claimed != nil {
		return claimed, nil
	}
	// claimできなかった＝競合/不可。理由を判定してエラーにする。
	return s.GetPurchasableListing(ctx, repo, listingID, buyerID)
}
