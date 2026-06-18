// Package ordersdomain は注文(order)のdomainモデルとrepository portを定義する。
package ordersdomain

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// OrderStatus は注文の状態。
type OrderStatus string

const (
	OrderStatusPaid      OrderStatus = "PAID"
	OrderStatusShipped   OrderStatus = "SHIPPED"
	OrderStatusReceived  OrderStatus = "RECEIVED"
	OrderStatusCompleted OrderStatus = "COMPLETED"
	OrderStatusCanceled  OrderStatus = "CANCELED"
)

// Order は注文のEntity。状態遷移と参加者権限をmethodで表す。
//
// ARCH-EXCEPTION(§6): 金額は price(int32)+currency(string)。理由/解消条件は
// listingsdomain.ListingFields の同マーカー参照（単一通貨JPY・円単位整数のため Money 未導入）。
type Order struct {
	id          uuid.UUID
	listingID   uuid.UUID
	buyerID     uuid.UUID
	sellerID    uuid.UUID
	status      OrderStatus
	price       int32
	currency    string
	createdAt   time.Time
	paidAt      *time.Time
	shippedAt   *time.Time
	receivedAt  *time.Time
	completedAt *time.Time
	canceledAt  *time.Time
}

type CreatePaidOrderInput struct {
	ID        uuid.UUID
	ListingID uuid.UUID
	BuyerID   uuid.UUID
	SellerID  uuid.UUID
	Price     int32
	Currency  string
	Now       time.Time
}

// CreatePaid は支払い済み注文(status=PAID)を生成する。買い手≠売り手・正の価格を要求する。
func CreatePaid(in CreatePaidOrderInput) (*Order, error) {
	if in.BuyerID == in.SellerID {
		return nil, apperr.Domain("ORDER_BUYER_SELLER_SAME", "Buyer and seller must be different.")
	}
	if in.Price <= 0 {
		return nil, apperr.Domain("ORDER_PRICE_INVALID", "Order price must be a positive integer.",
			apperr.FieldError{Field: "price", Reason: "positive"})
	}
	currency := in.Currency
	if currency == "" {
		currency = "JPY"
	}
	now := in.Now
	return &Order{
		id:        in.ID,
		listingID: in.ListingID,
		buyerID:   in.BuyerID,
		sellerID:  in.SellerID,
		status:    OrderStatusPaid,
		price:     in.Price,
		currency:  currency,
		createdAt: now,
		paidAt:    &now,
	}, nil
}

type RehydrateInput struct {
	ID          uuid.UUID
	ListingID   uuid.UUID
	BuyerID     uuid.UUID
	SellerID    uuid.UUID
	Status      OrderStatus
	Price       int32
	Currency    string
	CreatedAt   time.Time
	PaidAt      *time.Time
	ShippedAt   *time.Time
	ReceivedAt  *time.Time
	CompletedAt *time.Time
	CanceledAt  *time.Time
}

func Rehydrate(in RehydrateInput) *Order {
	return &Order{
		id:          in.ID,
		listingID:   in.ListingID,
		buyerID:     in.BuyerID,
		sellerID:    in.SellerID,
		status:      in.Status,
		price:       in.Price,
		currency:    in.Currency,
		createdAt:   in.CreatedAt,
		paidAt:      in.PaidAt,
		shippedAt:   in.ShippedAt,
		receivedAt:  in.ReceivedAt,
		completedAt: in.CompletedAt,
		canceledAt:  in.CanceledAt,
	}
}

func (o *Order) ID() uuid.UUID           { return o.id }
func (o *Order) ListingID() uuid.UUID    { return o.listingID }
func (o *Order) BuyerID() uuid.UUID      { return o.buyerID }
func (o *Order) SellerID() uuid.UUID     { return o.sellerID }
func (o *Order) Status() OrderStatus     { return o.status }
func (o *Order) Price() int32            { return o.price }
func (o *Order) Currency() string        { return o.currency }
func (o *Order) CreatedAt() time.Time    { return o.createdAt }
func (o *Order) PaidAt() *time.Time      { return o.paidAt }
func (o *Order) ShippedAt() *time.Time   { return o.shippedAt }
func (o *Order) ReceivedAt() *time.Time  { return o.receivedAt }
func (o *Order) CompletedAt() *time.Time { return o.completedAt }
func (o *Order) CanceledAt() *time.Time  { return o.canceledAt }

// IsParticipant は買い手/売り手のいずれかかを返す。
func (o *Order) IsParticipant(userID uuid.UUID) bool {
	return o.buyerID == userID || o.sellerID == userID
}

func (o *Order) MarkShipped(actorID uuid.UUID, now time.Time) error {
	if actorID != o.sellerID {
		return apperr.Domain("ORDER_SHIPPER_NOT_SELLER", "Only the seller can mark an order shipped.")
	}
	if o.status != OrderStatusPaid {
		return apperr.Domain("ORDER_NOT_SHIPPABLE", "Only paid orders can be marked shipped.")
	}
	o.status = OrderStatusShipped
	o.shippedAt = &now
	return nil
}

func (o *Order) MarkReceived(actorID uuid.UUID, now time.Time) error {
	if actorID != o.buyerID {
		return apperr.Domain("ORDER_RECEIVER_NOT_BUYER", "Only the buyer can mark an order received.")
	}
	if o.status != OrderStatusShipped {
		return apperr.Domain("ORDER_NOT_RECEIVABLE", "Only shipped orders can be marked received.")
	}
	o.status = OrderStatusReceived
	o.receivedAt = &now
	return nil
}

// CompleteAfterReviews は受領済み注文を完了にする（双方レビュー成立時, Inc 7で利用）。
func (o *Order) CompleteAfterReviews(now time.Time) error {
	if o.status != OrderStatusReceived {
		return apperr.Domain("ORDER_NOT_COMPLETABLE", "Only received orders can be completed.")
	}
	o.status = OrderStatusCompleted
	o.completedAt = &now
	return nil
}

func (o *Order) Cancel(actorID uuid.UUID, now time.Time) error {
	if actorID != o.buyerID && actorID != o.sellerID {
		return apperr.Domain("ORDER_CANCEL_ACTOR_INVALID", "Only order participants can cancel an order.")
	}
	if o.status != OrderStatusPaid {
		return apperr.Domain("ORDER_NOT_CANCELABLE", "Only paid orders can be canceled.")
	}
	o.status = OrderStatusCanceled
	o.canceledAt = &now
	return nil
}

// SearchInput は注文の有界検索条件。participantは buyer/seller いずれか一致。
type SearchInput struct {
	ParticipantID *uuid.UUID
	BuyerID       *uuid.UUID
	SellerID      *uuid.UUID
	Status        *OrderStatus
	Limit         *int32
}

// OrderRepository は注文の永続化port。見つからない場合は (nil, nil)。
type OrderRepository interface {
	Save(ctx context.Context, order *Order) error
	FindByID(ctx context.Context, id uuid.UUID) (*Order, error)
	FindByListingID(ctx context.Context, listingID uuid.UUID) (*Order, error)
	Search(ctx context.Context, in SearchInput) ([]*Order, error)
}
