// Package signaturesdomain はWorld ID検証とHuman Signatureのdomainモデルを定義する。
package signaturesdomain

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// SignatureAction は署名が表す業務操作。
type SignatureAction string

const (
	ActionListingPublish SignatureAction = "listing-publish"
	ActionListingUpdate  SignatureAction = "listing-update"
	ActionReviewSubmit   SignatureAction = "review-submit"
)

// SignatureResource は署名対象リソース種別。
type SignatureResource string

const (
	ResourceListing SignatureResource = "LISTING"
	ResourceReview  SignatureResource = "REVIEW"
)

// SignatureStatus は署名の状態。
type SignatureStatus string

const (
	StatusValid   SignatureStatus = "VALID"
	StatusRevoked SignatureStatus = "REVOKED"
)

// HumanSignature は「人間が確かに承認した」ことのJWS署名Entity。
type HumanSignature struct {
	id                    uuid.UUID
	userID                uuid.UUID
	actionType            SignatureAction
	resourceType          SignatureResource
	resourceID            uuid.UUID
	payloadHash           string
	signatureValue        string
	worldIDVerificationID uuid.UUID
	status                SignatureStatus
	signedAt              time.Time
	revokedAt             *time.Time
}

type CreateHumanSignatureInput struct {
	ID                    uuid.UUID
	UserID                uuid.UUID
	ActionType            SignatureAction
	ResourceType          SignatureResource
	ResourceID            uuid.UUID
	PayloadHash           string
	SignatureValue        string
	WorldIDVerificationID uuid.UUID
	SignedAt              time.Time
}

// NewValidSignature は有効(VALID)な署名を生成する。payload_hashは sha256: 形式を要求。
func NewValidSignature(in CreateHumanSignatureInput) (*HumanSignature, error) {
	if strings.TrimSpace(in.PayloadHash) == "" || strings.TrimSpace(in.SignatureValue) == "" {
		return nil, apperr.Domain("HUMAN_SIGNATURE_FIELD_REQUIRED", "signature fields are required.")
	}
	if !strings.HasPrefix(in.PayloadHash, "sha256:") {
		return nil, apperr.Domain("HUMAN_SIGNATURE_PAYLOAD_HASH_INVALID", "Payload hash must use sha256 format.")
	}
	return &HumanSignature{
		id:                    in.ID,
		userID:                in.UserID,
		actionType:            in.ActionType,
		resourceType:          in.ResourceType,
		resourceID:            in.ResourceID,
		payloadHash:           in.PayloadHash,
		signatureValue:        in.SignatureValue,
		worldIDVerificationID: in.WorldIDVerificationID,
		status:                StatusValid,
		signedAt:              in.SignedAt,
	}, nil
}

func (s *HumanSignature) ID() uuid.UUID                    { return s.id }
func (s *HumanSignature) UserID() uuid.UUID                { return s.userID }
func (s *HumanSignature) ActionType() SignatureAction      { return s.actionType }
func (s *HumanSignature) ResourceType() SignatureResource  { return s.resourceType }
func (s *HumanSignature) ResourceID() uuid.UUID            { return s.resourceID }
func (s *HumanSignature) PayloadHash() string              { return s.payloadHash }
func (s *HumanSignature) SignatureValue() string           { return s.signatureValue }
func (s *HumanSignature) WorldIDVerificationID() uuid.UUID { return s.worldIDVerificationID }
func (s *HumanSignature) Status() SignatureStatus          { return s.status }
func (s *HumanSignature) SignedAt() time.Time              { return s.signedAt }
func (s *HumanSignature) RevokedAt() *time.Time            { return s.revokedAt }

// WorldIdVerification はWorld ID Verify APIを通過した検証記録Entity。
type WorldIdVerification struct {
	id                uuid.UUID
	userID            uuid.UUID
	action            string
	nullifierHash     string
	verificationLevel string
	signalHash        *string
	environment       string
	verifiedAt        time.Time
	createdAt         time.Time
}

type CreateWorldIdVerificationInput struct {
	ID                uuid.UUID
	UserID            uuid.UUID
	Action            string
	NullifierHash     string
	VerificationLevel string
	SignalHash        *string
	Environment       string
	VerifiedAt        time.Time
	Now               time.Time
}

func NewWorldIdVerification(in CreateWorldIdVerificationInput) (*WorldIdVerification, error) {
	for _, v := range []string{in.Action, in.NullifierHash, in.VerificationLevel, in.Environment} {
		if strings.TrimSpace(v) == "" {
			return nil, apperr.Domain("WORLD_ID_VERIFICATION_FIELD_REQUIRED", "world id verification fields are required.")
		}
	}
	return &WorldIdVerification{
		id:                in.ID,
		userID:            in.UserID,
		action:            in.Action,
		nullifierHash:     in.NullifierHash,
		verificationLevel: in.VerificationLevel,
		signalHash:        in.SignalHash,
		environment:       in.Environment,
		verifiedAt:        in.VerifiedAt,
		createdAt:         in.Now,
	}, nil
}

func (v *WorldIdVerification) ID() uuid.UUID             { return v.id }
func (v *WorldIdVerification) UserID() uuid.UUID         { return v.userID }
func (v *WorldIdVerification) Action() string            { return v.action }
func (v *WorldIdVerification) NullifierHash() string     { return v.nullifierHash }
func (v *WorldIdVerification) VerificationLevel() string { return v.verificationLevel }
func (v *WorldIdVerification) SignalHash() *string       { return v.signalHash }
func (v *WorldIdVerification) Environment() string       { return v.environment }
func (v *WorldIdVerification) VerifiedAt() time.Time     { return v.verifiedAt }
func (v *WorldIdVerification) CreatedAt() time.Time      { return v.createdAt }

// FindValidInput は同一payloadの有効署名検索条件（多重署名防止）。
type FindValidInput struct {
	ActionType   SignatureAction
	ResourceType SignatureResource
	ResourceID   uuid.UUID
	PayloadHash  string
}

// HumanSignatureRepository はHuman Signatureの永続化port。
type HumanSignatureRepository interface {
	Save(ctx context.Context, signature *HumanSignature) error
	FindValidByResourcePayload(ctx context.Context, in FindValidInput) (*HumanSignature, error)
}

// WorldIdVerificationRepository はWorld ID検証記録の永続化port。
type WorldIdVerificationRepository interface {
	Save(ctx context.Context, verification *WorldIdVerification) error
	CountByUserAction(ctx context.Context, userID uuid.UUID, action string) (int64, error)
}
