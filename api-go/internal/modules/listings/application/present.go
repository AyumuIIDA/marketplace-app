// Package listingsapp は出品のUseCaseを実装する。
package listingsapp

import (
	"time"

	listingsdomain "marketplace/api-go/internal/modules/listings/domain"
)

// ImageView は応答中の画像表現。
type ImageView struct {
	URL       string `json:"url"`
	SortOrder int32  `json:"sortOrder"`
}

// ListingView は出品の応答表現（既存フロント互換のcamelCase）。
//
// ARCH-EXCEPTION(§13): 省略可能な日時(publishedAt/soldAt)は omitzero ではなく *time.Time + omitempty
//
//	で表す。理由: これらは「未発生(null)」と「ゼロ値」を区別すべきnullable列であり、pointerが
//	null/非null を自然に表現する。必須日時(createdAt/updatedAt)は値型 time.Time のまま。
type ListingView struct {
	ListingID   string      `json:"listingId"`
	SellerID    string      `json:"sellerId"`
	AgentID     *string     `json:"agentId,omitempty"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Price       int32       `json:"price"`
	Currency    string      `json:"currency"`
	Category    string      `json:"category"`
	Condition   string      `json:"condition"`
	Status      string      `json:"status"`
	SignatureID *string     `json:"signatureId,omitempty"`
	// ソーシャル集計（social module 由来。未取得時は0）。Instagram風カードのいいね/コメント数表示に使う。
	LikeCount    int64       `json:"likeCount"`
	CommentCount int64       `json:"commentCount"`
	Images       []ImageView `json:"images"`
	CreatedAt    time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt"`
	PublishedAt *time.Time  `json:"publishedAt,omitempty"`
	SoldAt      *time.Time  `json:"soldAt,omitempty"`
}

func presentListing(l *listingsdomain.Listing) ListingView {
	f := l.Fields()
	images := make([]ImageView, 0, len(l.Images()))
	for _, im := range l.Images() {
		images = append(images, ImageView{URL: im.URL, SortOrder: im.SortOrder})
	}

	var agentID *string
	if l.AgentID() != nil {
		s := l.AgentID().String()
		agentID = &s
	}
	var signatureID *string
	if l.SignatureID() != nil {
		s := l.SignatureID().String()
		signatureID = &s
	}

	return ListingView{
		ListingID:   l.ID().String(),
		SellerID:    l.SellerID().String(),
		AgentID:     agentID,
		Title:       f.Title,
		Description: f.Description,
		Price:       f.Price,
		Currency:    f.Currency,
		Category:    f.Category,
		Condition:   f.Condition,
		Status:      string(l.Status()),
		SignatureID: signatureID,
		Images:      images,
		CreatedAt:   l.CreatedAt(),
		UpdatedAt:   l.UpdatedAt(),
		PublishedAt: l.PublishedAt(),
		SoldAt:      l.SoldAt(),
	}
}
