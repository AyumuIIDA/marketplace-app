// Package ordersapp は注文のUseCase/Serviceを実装する。
package ordersapp

import (
	"time"

	ordersdomain "github.com/outarc/marketplace/api-go/internal/modules/orders/domain"
)

// OrderView は注文の応答表現（既存フロント互換のcamelCase）。
type OrderView struct {
	OrderID     string     `json:"orderId"`
	ListingID   string     `json:"listingId"`
	BuyerID     string     `json:"buyerId"`
	SellerID    string     `json:"sellerId"`
	Status      string     `json:"status"`
	Price       int32      `json:"price"`
	Currency    string     `json:"currency"`
	CreatedAt   time.Time  `json:"createdAt"`
	PaidAt      *time.Time `json:"paidAt,omitempty"`
	ShippedAt   *time.Time `json:"shippedAt,omitempty"`
	ReceivedAt  *time.Time `json:"receivedAt,omitempty"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
	CanceledAt  *time.Time `json:"canceledAt,omitempty"`
}

// PresentOrder はEntityを応答DTOへ写す。
func PresentOrder(o *ordersdomain.Order) OrderView {
	return OrderView{
		OrderID:     o.ID().String(),
		ListingID:   o.ListingID().String(),
		BuyerID:     o.BuyerID().String(),
		SellerID:    o.SellerID().String(),
		Status:      string(o.Status()),
		Price:       o.Price(),
		Currency:    o.Currency(),
		CreatedAt:   o.CreatedAt(),
		PaidAt:      o.PaidAt(),
		ShippedAt:   o.ShippedAt(),
		ReceivedAt:  o.ReceivedAt(),
		CompletedAt: o.CompletedAt(),
		CanceledAt:  o.CanceledAt(),
	}
}
