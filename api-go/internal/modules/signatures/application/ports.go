package signaturesapp

import (
	"context"
	"time"

	"github.com/google/uuid"

	signaturesdomain "marketplace/api-go/internal/modules/signatures/domain"
)

// VerifiedWorldID はWorld ID Verify APIを通過した検証結果。
type VerifiedWorldID struct {
	Action            string
	NullifierHash     string
	VerificationLevel string
	SignalHash        *string
	Environment       string
	VerifiedAt        time.Time
}

// WorldIdVerifier はWorld ID proof検証port（infraに実装）。
type WorldIdVerifier interface {
	Verify(ctx context.Context, idKit IdKitResult) (VerifiedWorldID, error)
}

// SignInput はHuman Signature署名要求。
type SignInput struct {
	SignatureID           uuid.UUID
	UserID                uuid.UUID
	ActionType            signaturesdomain.SignatureAction
	ResourceType          signaturesdomain.SignatureResource
	ResourceID            uuid.UUID
	PayloadHash           string
	WorldIDVerificationID uuid.UUID
	IssuedAt              time.Time
}

// SignOutput は署名結果（JWS compact serialization）。
type SignOutput struct {
	SignatureValue string
	SignedAt       time.Time
}

// HumanSignatureSigner はHuman SignatureのJWS署名port（infraに実装）。
type HumanSignatureSigner interface {
	Sign(ctx context.Context, in SignInput) (SignOutput, error)
}
