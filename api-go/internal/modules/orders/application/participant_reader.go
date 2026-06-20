package ordersapp

import (
	"context"

	"github.com/google/uuid"

	ordersdomain "marketplace/api-go/internal/modules/orders/domain"
)

// ListingParticipantReader は「ある listing の注文当事者か」を判定する read adapter。
// listings module の OrderParticipantReader port を構造的に満たし、composition root が注入する。
// 用途: 売却済み出品を、その取引の買い手が閲覧できるようにする（出品ページの可視性緩和）。
type ListingParticipantReader struct {
	orders ordersdomain.OrderRepository
}

func NewListingParticipantReader(orders ordersdomain.OrderRepository) *ListingParticipantReader {
	return &ListingParticipantReader{orders: orders}
}

// IsOrderParticipant は listingID の注文が存在し、userID が買い手/売り手のいずれかなら true。
func (r *ListingParticipantReader) IsOrderParticipant(ctx context.Context, listingID, userID uuid.UUID) (bool, error) {
	order, err := r.orders.FindByListingID(ctx, listingID)
	if err != nil {
		return false, err
	}
	if order == nil {
		return false, nil
	}
	return order.IsParticipant(userID), nil
}
