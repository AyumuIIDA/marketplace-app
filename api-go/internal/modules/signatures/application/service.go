package signaturesapp

import (
	"context"
	"time"

	"github.com/google/uuid"

	signaturesdomain "marketplace/api-go/internal/modules/signatures/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/clock"
	"marketplace/api-go/internal/shared/ids"
)

// SignatureRepos は署名transaction内で使うtx-bound repository群。
type SignatureRepos struct {
	HumanSignatures      signaturesdomain.HumanSignatureRepository
	WorldIDVerifications signaturesdomain.WorldIdVerificationRepository
}

// VerifiedHumanPresence は verifyHumanPresence を通過した「検証済み人間証明」。
// 非公開フィールドにより signaturesapp 外からは構築できない（= この値の保持自体が検証通過の証拠）。
type VerifiedHumanPresence struct {
	v VerifiedWorldID
}

// --- HumanSignatureService（2フェーズ）---

type HumanSignatureService struct {
	verifier WorldIdVerifier
	creator  *HumanSignatureCreator
}

func NewHumanSignatureService(verifier WorldIdVerifier, creator *HumanSignatureCreator) *HumanSignatureService {
	return &HumanSignatureService{verifier: verifier, creator: creator}
}

type VerifyHumanPresenceInput struct {
	IdKit               IdKitResult
	ExpectedAction      signaturesdomain.SignatureAction
	ExpectedEnvironment *string
}

// VerifyHumanPresence は Phase 1（tx外）。外部World ID検証 + action/env整合確認。
func (s *HumanSignatureService) VerifyHumanPresence(ctx context.Context, in VerifyHumanPresenceInput) (VerifiedHumanPresence, error) {
	verified, err := s.verifier.Verify(ctx, in.IdKit)
	if err != nil {
		return VerifiedHumanPresence{}, err
	}
	if err := AssertWorldIDMatchesAction(verified, string(in.ExpectedAction), in.ExpectedEnvironment); err != nil {
		return VerifiedHumanPresence{}, err
	}
	return VerifiedHumanPresence{v: verified}, nil
}

type RecordSignatureInput struct {
	UserID             uuid.UUID
	ActionType         signaturesdomain.SignatureAction
	ResourceType       signaturesdomain.SignatureResource
	ResourceID         uuid.UUID
	PayloadHash        string
	ExpectedSignalHash *string
	Presence           VerifiedHumanPresence
}

type RecordSignatureOutput struct {
	SignatureID           uuid.UUID
	WorldIDVerificationID uuid.UUID
	VerificationCount     int64
	SignedAt              time.Time
}

// RecordSignature は Phase 2（tx内）。signal_hash束縛確認 + 署名作成・永続化。
func (s *HumanSignatureService) RecordSignature(ctx context.Context, repos SignatureRepos, in RecordSignatureInput) (RecordSignatureOutput, error) {
	if err := AssertSignalHashBindsPayload(in.Presence.v.SignalHash, in.ExpectedSignalHash); err != nil {
		return RecordSignatureOutput{}, err
	}
	return s.creator.Create(ctx, repos, createInput{
		UserID:          in.UserID,
		ActionType:      in.ActionType,
		ResourceType:    in.ResourceType,
		ResourceID:      in.ResourceID,
		PayloadHash:     in.PayloadHash,
		VerifiedWorldID: in.Presence.v,
	})
}

// --- HumanSignatureCreator ---

type HumanSignatureCreator struct {
	signer HumanSignatureSigner
	ids    ids.Generator
	clock  clock.Clock
}

func NewHumanSignatureCreator(signer HumanSignatureSigner, g ids.Generator, c clock.Clock) *HumanSignatureCreator {
	return &HumanSignatureCreator{signer: signer, ids: g, clock: c}
}

type createInput struct {
	UserID          uuid.UUID
	ActionType      signaturesdomain.SignatureAction
	ResourceType    signaturesdomain.SignatureResource
	ResourceID      uuid.UUID
	PayloadHash     string
	VerifiedWorldID VerifiedWorldID
}

func (c *HumanSignatureCreator) Create(ctx context.Context, repos SignatureRepos, in createInput) (RecordSignatureOutput, error) {
	existing, err := repos.HumanSignatures.FindValidByResourcePayload(ctx, signaturesdomain.FindValidInput{
		ActionType:   in.ActionType,
		ResourceType: in.ResourceType,
		ResourceID:   in.ResourceID,
		PayloadHash:  in.PayloadHash,
	})
	if err != nil {
		return RecordSignatureOutput{}, err
	}
	if existing != nil {
		return RecordSignatureOutput{}, apperr.Domain("HUMAN_SIGNATURE_ALREADY_EXISTS", "A valid signature already exists.")
	}

	now := c.clock.Now()
	verification, err := signaturesdomain.NewWorldIdVerification(signaturesdomain.CreateWorldIdVerificationInput{
		ID:                c.ids.NewID(),
		UserID:            in.UserID,
		Action:            in.VerifiedWorldID.Action,
		NullifierHash:     in.VerifiedWorldID.NullifierHash,
		VerificationLevel: in.VerifiedWorldID.VerificationLevel,
		SignalHash:        in.VerifiedWorldID.SignalHash,
		Environment:       in.VerifiedWorldID.Environment,
		VerifiedAt:        in.VerifiedWorldID.VerifiedAt,
		Now:               now,
	})
	if err != nil {
		return RecordSignatureOutput{}, err
	}

	signatureID := c.ids.NewID()
	signed, err := c.signer.Sign(ctx, SignInput{
		SignatureID:           signatureID,
		UserID:                in.UserID,
		ActionType:            in.ActionType,
		ResourceType:          in.ResourceType,
		ResourceID:            in.ResourceID,
		PayloadHash:           in.PayloadHash,
		WorldIDVerificationID: verification.ID(),
		IssuedAt:              now,
	})
	if err != nil {
		return RecordSignatureOutput{}, err
	}

	signature, err := signaturesdomain.NewValidSignature(signaturesdomain.CreateHumanSignatureInput{
		ID:                    signatureID,
		UserID:                in.UserID,
		ActionType:            in.ActionType,
		ResourceType:          in.ResourceType,
		ResourceID:            in.ResourceID,
		PayloadHash:           in.PayloadHash,
		SignatureValue:        signed.SignatureValue,
		WorldIDVerificationID: verification.ID(),
		SignedAt:              signed.SignedAt,
	})
	if err != nil {
		return RecordSignatureOutput{}, err
	}

	if err := repos.WorldIDVerifications.Save(ctx, verification); err != nil {
		return RecordSignatureOutput{}, err
	}
	if err := repos.HumanSignatures.Save(ctx, signature); err != nil {
		return RecordSignatureOutput{}, err
	}
	count, err := repos.WorldIDVerifications.CountByUserAction(ctx, in.UserID, string(in.ActionType))
	if err != nil {
		return RecordSignatureOutput{}, err
	}

	return RecordSignatureOutput{
		SignatureID:           signature.ID(),
		WorldIDVerificationID: verification.ID(),
		VerificationCount:     count,
		SignedAt:              signature.SignedAt(),
	}, nil
}
