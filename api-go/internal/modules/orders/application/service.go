package ordersapp

import (
	"context"

	"github.com/google/uuid"

	ordersdomain "marketplace/api-go/internal/modules/orders/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/clock"
	"marketplace/api-go/internal/shared/ids"
)

// OrderFulfillmentService は注文の生成/取得の業務手続き。
// repository は呼び出し側（usecase=pool / workflow=tx）から都度受け取り、tx境界を持たない。
type OrderFulfillmentService struct {
	ids   ids.Generator
	clock clock.Clock
}

func NewOrderFulfillmentService(g ids.Generator, c clock.Clock) *OrderFulfillmentService {
	return &OrderFulfillmentService{ids: g, clock: c}
}

type CreatePaidOrderInput struct {
	ListingID       uuid.UUID
	BuyerID         uuid.UUID
	SellerID        uuid.UUID
	Price           int32
	Currency        string
	ListingTitle    string
	ListingImageURL string
}

// CreatePaidOrder は同一listingに既存注文が無ければ支払い済み注文を作る。
func (s *OrderFulfillmentService) CreatePaidOrder(ctx context.Context, repo ordersdomain.OrderRepository, in CreatePaidOrderInput) (OrderView, error) {
	existing, err := repo.FindByListingID(ctx, in.ListingID)
	if err != nil {
		return OrderView{}, err
	}
	if existing != nil {
		return OrderView{}, apperr.Forbidden("This listing already has an order.")
	}

	order, err := ordersdomain.CreatePaid(ordersdomain.CreatePaidOrderInput{
		ID:              s.ids.NewID(),
		ListingID:       in.ListingID,
		BuyerID:         in.BuyerID,
		SellerID:        in.SellerID,
		Price:           in.Price,
		Currency:        in.Currency,
		ListingTitle:    in.ListingTitle,
		ListingImageURL: in.ListingImageURL,
		Now:             s.clock.Now(),
	})
	if err != nil {
		return OrderView{}, err
	}
	if err := repo.Save(ctx, order); err != nil {
		return OrderView{}, err
	}
	return PresentOrder(order), nil
}

// GetOrderForParticipant は注文を取得し、参加者(買い手/売り手)のみ許可する。
func (s *OrderFulfillmentService) GetOrderForParticipant(ctx context.Context, repo ordersdomain.OrderRepository, orderID, participantID uuid.UUID) (*ordersdomain.Order, error) {
	order, err := repo.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order == nil {
		return nil, apperr.NotFound("Order", orderID.String())
	}
	if !order.IsParticipant(participantID) {
		return nil, apperr.Forbidden("Only order participants can access this order.")
	}
	return order, nil
}
