package listingsapp

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

	listingsdomain "github.com/outarc/marketplace/api-go/internal/modules/listings/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// ListingPublicationService は出品のpublish/update（human signature付き）の業務手続き。
// repository は workflow のtx-bound repoを受け取り、tx境界は持たない。
type ListingPublicationService struct{}

func NewListingPublicationService() ListingPublicationService { return ListingPublicationService{} }

// GetListingForSellerMutation は出品を取得し、売り手が変更可能か検証する。
func (ListingPublicationService) GetListingForSellerMutation(ctx context.Context, repo listingsdomain.ListingRepository, listingID, sellerID uuid.UUID) (*listingsdomain.Listing, error) {
	listing, err := repo.FindByID(ctx, listingID)
	if err != nil {
		return nil, err
	}
	if listing == nil {
		return nil, apperr.NotFound("Listing", listingID.String())
	}
	if !listingsdomain.CanSellerMutate(listing, sellerID) {
		return nil, apperr.Forbidden("Only the seller can mutate this listing.")
	}
	return listing, nil
}

// PublishWithSignature は下書きを公開(PUBLISHED)し、署名IDを紐づける。
func (ListingPublicationService) PublishWithSignature(ctx context.Context, repo listingsdomain.ListingRepository, listing *listingsdomain.Listing, signatureID uuid.UUID, signedAt time.Time) error {
	if err := listing.Publish(&signatureID, signedAt); err != nil {
		return err
	}
	return repo.Save(ctx, listing)
}

// UpdateWithSignature は公開中出品を新署名で更新する。
func (ListingPublicationService) UpdateWithSignature(ctx context.Context, repo listingsdomain.ListingRepository, listing *listingsdomain.Listing, fields listingsdomain.ListingFields, signatureID uuid.UUID, signedAt time.Time) error {
	if err := listing.UpdatePublishedWithSignature(fields, signatureID, signedAt); err != nil {
		return err
	}
	return repo.Save(ctx, listing)
}

// ComputeListingPayloadHash は出品の正準JSONからsha256ハッシュ(sha256:hex)を計算する。
// 既存TSと同じキー順・compact・HTMLエスケープ無しで一貫性を保つ。
func ComputeListingPayloadHash(p ListingSignaturePayload) (string, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(p); err != nil {
		return "", apperr.Internal("failed to encode listing payload", err)
	}
	// Encode は末尾改行を付けるため除去してからhash。
	canonical := bytes.TrimRight(buf.Bytes(), "\n")
	sum := sha256.Sum256(canonical)
	return fmt.Sprintf("sha256:%s", hex.EncodeToString(sum[:])), nil
}

// ListingSignaturePayload は署名対象の正準表現（キー順固定）。
type ListingSignaturePayload struct {
	ListingID   string  `json:"listingId"`
	SellerID    string  `json:"sellerId"`
	AgentID     *string `json:"agentId"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Price       int32   `json:"price"`
	Currency    string  `json:"currency"`
	Category    string  `json:"category"`
	Condition   string  `json:"condition"`
}

// ListingToSignaturePayload は現在のListingから署名payloadを作る。
func ListingToSignaturePayload(l *listingsdomain.Listing) ListingSignaturePayload {
	return signaturePayload(l.ID(), l.SellerID(), l.AgentID(), l.Fields())
}

// SignaturePayloadFor は更新後fieldsで署名payloadを作る（update時の差し替え本文に対するhash）。
func SignaturePayloadFor(listingID, sellerID uuid.UUID, agentID *uuid.UUID, fields listingsdomain.ListingFields) ListingSignaturePayload {
	return signaturePayload(listingID, sellerID, agentID, fields)
}

func signaturePayload(listingID, sellerID uuid.UUID, agentID *uuid.UUID, f listingsdomain.ListingFields) ListingSignaturePayload {
	var agent *string
	if agentID != nil {
		s := agentID.String()
		agent = &s
	}
	return ListingSignaturePayload{
		ListingID:   listingID.String(),
		SellerID:    sellerID.String(),
		AgentID:     agent,
		Title:       f.Title,
		Description: f.Description,
		Price:       f.Price,
		Currency:    f.Currency,
		Category:    f.Category,
		Condition:   f.Condition,
	}
}
