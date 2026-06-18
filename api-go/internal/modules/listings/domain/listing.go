// Package listingsdomain は出品(listing)のdomainモデルとrepository portを定義する。
package listingsdomain

import (
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// ListingStatus は出品の状態。
type ListingStatus string

const (
	ListingStatusDraft     ListingStatus = "DRAFT"
	ListingStatusPublished ListingStatus = "PUBLISHED"
	ListingStatusSold      ListingStatus = "SOLD"
	ListingStatusHidden    ListingStatus = "HIDDEN"
)

// CurrencyJPY はサポートする唯一の通貨。価格は最小単位(円)の整数。
const CurrencyJPY = "JPY"

// ListingFields は出品の本文フィールド（作成/更新で差し替える部分）。
//
// ARCH-EXCEPTION(§6): 金額を Money 値オブジェクトではなく price(int32) + currency(string) で表す。
//
//	理由: 既存TS実装が price:number/currency:"JPY" で、DB列も integer/varchar(3)。本デモは
//	     単一通貨(JPY,円単位の整数)で通貨混在演算が無いため、Money導入の利得が小さい。
//	不変条件: price>0 を validateFields で強制、currency は CurrencyJPY 既定・固定。
//	解消条件: 多通貨/小数金額/為替が要件化したら Money{amount int64; currency} を導入する。
type ListingFields struct {
	Title       string
	Description string
	Price       int32
	Currency    string
	Category    string
	Condition   string
}

// ListingImageRef は表示用の画像参照（振る舞いには影響しない読み取り属性）。
type ListingImageRef struct {
	URL       string
	SortOrder int32
}

// Listing は出品のEntity。状態遷移はmethodで表し、不変条件はここで検証する。
type Listing struct {
	id          uuid.UUID
	sellerID    uuid.UUID
	agentID     *uuid.UUID
	fields      ListingFields
	status      ListingStatus
	signatureID *uuid.UUID
	images      []ListingImageRef
	createdAt   time.Time
	updatedAt   time.Time
	publishedAt *time.Time
	soldAt      *time.Time
}

// CreateDraftInput は下書き出品の生成入力。
type CreateDraftInput struct {
	ID       uuid.UUID
	SellerID uuid.UUID
	AgentID  *uuid.UUID
	Fields   ListingFields
	Now      time.Time
}

// NewDraft は不変条件を検証して下書き(status=DRAFT)を生成する。
func NewDraft(in CreateDraftInput) (*Listing, error) {
	fields := in.Fields
	if fields.Currency == "" {
		fields.Currency = CurrencyJPY
	}
	if err := validateFields(fields); err != nil {
		return nil, err
	}
	return &Listing{
		id:        in.ID,
		sellerID:  in.SellerID,
		agentID:   in.AgentID,
		fields:    fields,
		status:    ListingStatusDraft,
		createdAt: in.Now,
		updatedAt: in.Now,
	}, nil
}

// RehydrateInput はDB行からの復元入力。
type RehydrateInput struct {
	ID          uuid.UUID
	SellerID    uuid.UUID
	AgentID     *uuid.UUID
	Fields      ListingFields
	Status      ListingStatus
	SignatureID *uuid.UUID
	Images      []ListingImageRef
	CreatedAt   time.Time
	UpdatedAt   time.Time
	PublishedAt *time.Time
	SoldAt      *time.Time
}

func Rehydrate(in RehydrateInput) *Listing {
	return &Listing{
		id:          in.ID,
		sellerID:    in.SellerID,
		agentID:     in.AgentID,
		fields:      in.Fields,
		status:      in.Status,
		signatureID: in.SignatureID,
		images:      in.Images,
		createdAt:   in.CreatedAt,
		updatedAt:   in.UpdatedAt,
		publishedAt: in.PublishedAt,
		soldAt:      in.SoldAt,
	}
}

func (l *Listing) ID() uuid.UUID             { return l.id }
func (l *Listing) SellerID() uuid.UUID       { return l.sellerID }
func (l *Listing) AgentID() *uuid.UUID       { return l.agentID }
func (l *Listing) Fields() ListingFields     { return l.fields }
func (l *Listing) Status() ListingStatus     { return l.status }
func (l *Listing) SignatureID() *uuid.UUID   { return l.signatureID }
func (l *Listing) Images() []ListingImageRef { return l.images }
func (l *Listing) CreatedAt() time.Time      { return l.createdAt }
func (l *Listing) UpdatedAt() time.Time      { return l.updatedAt }
func (l *Listing) PublishedAt() *time.Time   { return l.publishedAt }
func (l *Listing) SoldAt() *time.Time        { return l.soldAt }

// UpdateDraft は下書きのみ可。署名なしで本文を差し替える。
func (l *Listing) UpdateDraft(fields ListingFields, now time.Time) error {
	if l.status != ListingStatusDraft {
		return apperr.Domain("LISTING_DRAFT_UPDATE_NOT_ALLOWED",
			"Only draft listings can be updated without a new human signature.")
	}
	if fields.Currency == "" {
		fields.Currency = CurrencyJPY
	}
	if err := validateFields(fields); err != nil {
		return err
	}
	l.fields = fields
	l.updatedAt = now
	return nil
}

// UpdatePublishedWithSignature は公開中のみ可。新しいhuman signatureで本文を差し替える。
func (l *Listing) UpdatePublishedWithSignature(fields ListingFields, signatureID uuid.UUID, now time.Time) error {
	if l.status != ListingStatusPublished {
		return apperr.Domain("LISTING_SIGNED_UPDATE_NOT_ALLOWED",
			"Only published listings can be updated with a new human signature.")
	}
	if fields.Currency == "" {
		fields.Currency = CurrencyJPY
	}
	if err := validateFields(fields); err != nil {
		return err
	}
	l.fields = fields
	l.signatureID = &signatureID
	l.updatedAt = now
	return nil
}

// Publish は下書きのみ可。signatureID は任意。World ID署名なし(login のみ)でも公開できる。
// 署名があれば「人間が出品した証」として付与され、未署名は signatureID=nil のまま公開される。
func (l *Listing) Publish(signatureID *uuid.UUID, now time.Time) error {
	if l.status != ListingStatusDraft {
		return apperr.Domain("LISTING_NOT_PUBLISHABLE", "Only draft listings can be published.")
	}
	l.status = ListingStatusPublished
	if signatureID != nil {
		l.signatureID = signatureID
	}
	l.publishedAt = &now
	l.updatedAt = now
	return nil
}

// MarkSold は公開中のみ可。購入確定で売却済みにする。
func (l *Listing) MarkSold(now time.Time) error {
	if l.status != ListingStatusPublished {
		return apperr.Domain("LISTING_NOT_PURCHASABLE", "Only published listings can be purchased.")
	}
	l.status = ListingStatusSold
	l.soldAt = &now
	l.updatedAt = now
	return nil
}

// Hide は出品を非表示にする（状態不問）。
func (l *Listing) Hide(now time.Time) {
	l.status = ListingStatusHidden
	l.updatedAt = now
}

func validateFields(f ListingFields) error {
	// 既存TSと同じ評価順（title→description→category→condition）。mapだと順序が非決定的になるため固定。
	required := []struct {
		field string
		value string
	}{
		{"title", f.Title},
		{"description", f.Description},
		{"category", f.Category},
		{"condition", f.Condition},
	}
	for _, r := range required {
		if strings.TrimSpace(r.value) == "" {
			return apperr.Domain("LISTING_FIELD_REQUIRED", r.field+" is required.",
				apperr.FieldError{Field: r.field, Reason: "required"})
		}
	}
	if f.Price <= 0 {
		return apperr.Domain("LISTING_PRICE_INVALID", "Listing price must be a positive integer.",
			apperr.FieldError{Field: "price", Reason: "positive"})
	}
	return nil
}
