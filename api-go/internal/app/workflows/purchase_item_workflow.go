// Package workflows は複数moduleにまたがる業務手順（transaction境界を持つ）を実装する。
// workflow自身はApplication Port/Serviceとdomain repository interfaceのみに依存し、
// 具体的なtx/infraには依存しない（tx境界の実体は PurchaseTxRunner 実装が担う）。
package workflows

import (
	"context"

	"github.com/google/uuid"

	listingsapp "github.com/outarc/marketplace/api-go/internal/modules/listings/application"
	listingsdomain "github.com/outarc/marketplace/api-go/internal/modules/listings/domain"
	ordersapp "github.com/outarc/marketplace/api-go/internal/modules/orders/application"
	ordersdomain "github.com/outarc/marketplace/api-go/internal/modules/orders/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/clock"
)

// PurchaseRepos は購入transaction内で使うtx-bound repository群。
type PurchaseRepos struct {
	Listings listingsdomain.ListingRepository
	Orders   ordersdomain.OrderRepository
}

// PurchaseTxRunner は1 transaction内でtx-bound repoを束ねてfnを実行するport。
// 実体は infrastructure 側（txrunner）に置く。
type PurchaseTxRunner interface {
	Run(ctx context.Context, fn func(ctx context.Context, repos PurchaseRepos) error) error
}

type PurchaseItemInput struct {
	ListingID uuid.UUID
	BuyerID   uuid.UUID
	Confirmed bool
}

// PurchaseItemResult は確認要求 or 支払い済みのどちらか（既存TSのunionに対応）。
type PurchaseItemResult struct {
	Status    string               `json:"status"`
	ListingID string               `json:"listingId,omitempty"`
	Order     *ordersapp.OrderView `json:"order,omitempty"`
}

// PurchaseItemWorkflow は出品claim→注文作成を1 transactionで行う。
type PurchaseItemWorkflow struct {
	tx               PurchaseTxRunner
	listingPurchase  listingsapp.ListingPurchaseService
	orderFulfillment *ordersapp.OrderFulfillmentService
	clock            clock.Clock
}

func NewPurchaseItemWorkflow(tx PurchaseTxRunner, lp listingsapp.ListingPurchaseService, of *ordersapp.OrderFulfillmentService, c clock.Clock) *PurchaseItemWorkflow {
	return &PurchaseItemWorkflow{tx: tx, listingPurchase: lp, orderFulfillment: of, clock: c}
}

func (w *PurchaseItemWorkflow) Execute(ctx context.Context, in PurchaseItemInput) (PurchaseItemResult, error) {
	if !in.Confirmed {
		return PurchaseItemResult{Status: "REQUIRES_CONFIRMATION", ListingID: in.ListingID.String()}, nil
	}

	var order ordersapp.OrderView
	err := w.tx.Run(ctx, func(ctx context.Context, repos PurchaseRepos) error {
		listing, err := w.listingPurchase.ClaimForPurchase(ctx, repos.Listings, in.ListingID, in.BuyerID, w.clock.Now())
		if err != nil {
			return err
		}
		out, err := w.orderFulfillment.CreatePaidOrder(ctx, repos.Orders, ordersapp.CreatePaidOrderInput{
			ListingID: listing.ID(),
			BuyerID:   in.BuyerID,
			SellerID:  listing.SellerID(),
			Price:     listing.Fields().Price,
			Currency:  listing.Fields().Currency,
		})
		if err != nil {
			return err
		}
		order = out
		return nil
	})
	if err != nil {
		return PurchaseItemResult{}, err
	}
	return PurchaseItemResult{Status: "PAID", Order: &order}, nil
}
