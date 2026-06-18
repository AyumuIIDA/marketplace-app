package workflows

import (
	"context"

	"github.com/google/uuid"

	listingsapp "marketplace/api-go/internal/modules/listings/application"
	listingsdomain "marketplace/api-go/internal/modules/listings/domain"
	signaturesapp "marketplace/api-go/internal/modules/signatures/application"
	signaturesdomain "marketplace/api-go/internal/modules/signatures/domain"
)

// HumanSignatureRepos は human signature transaction内で使うtx-bound repository群。
type HumanSignatureRepos struct {
	Listings             listingsdomain.ListingRepository
	HumanSignatures      signaturesdomain.HumanSignatureRepository
	WorldIDVerifications signaturesdomain.WorldIdVerificationRepository
}

// HumanSignatureTxRunner は1 transaction内でtx-bound repoを束ねてfnを実行するport。
type HumanSignatureTxRunner interface {
	Run(ctx context.Context, fn func(ctx context.Context, repos HumanSignatureRepos) error) error
}

// HumanSignatureResult は publish/update（署名付き）の共通応答。
type HumanSignatureResult struct {
	ListingID             string `json:"listingId"`
	SignatureID           string `json:"signatureId"`
	WorldIDVerificationID string `json:"worldIdVerificationId"`
	VerificationCount     int64  `json:"verificationCount"`
	Status                string `json:"status"`
}

// --- PublishListingWithHumanSignature ---

type PublishListingInput struct {
	ListingID           uuid.UUID
	SellerID            uuid.UUID
	IdKit               signaturesapp.IdKitResult
	ExpectedEnvironment *string
}

type PublishListingWithHumanSignatureWorkflow struct {
	tx              HumanSignatureTxRunner
	listingPub      listingsapp.ListingPublicationService
	humanSignatures *signaturesapp.HumanSignatureService
}

func NewPublishListingWithHumanSignatureWorkflow(tx HumanSignatureTxRunner, pub listingsapp.ListingPublicationService, hs *signaturesapp.HumanSignatureService) *PublishListingWithHumanSignatureWorkflow {
	return &PublishListingWithHumanSignatureWorkflow{tx: tx, listingPub: pub, humanSignatures: hs}
}

func (w *PublishListingWithHumanSignatureWorkflow) Execute(ctx context.Context, in PublishListingInput) (HumanSignatureResult, error) {
	// Phase 1: World ID検証（tx外）。
	presence, err := w.humanSignatures.VerifyHumanPresence(ctx, signaturesapp.VerifyHumanPresenceInput{
		IdKit:               in.IdKit,
		ExpectedAction:      signaturesdomain.ActionListingPublish,
		ExpectedEnvironment: in.ExpectedEnvironment,
	})
	if err != nil {
		return HumanSignatureResult{}, err
	}

	// Phase 2: DB読み取り・署名永続化・状態変更（tx内）。
	var out HumanSignatureResult
	err = w.tx.Run(ctx, func(ctx context.Context, repos HumanSignatureRepos) error {
		listing, err := w.listingPub.GetListingForSellerMutation(ctx, repos.Listings, in.ListingID, in.SellerID)
		if err != nil {
			return err
		}
		payloadHash, err := listingsapp.ComputeListingPayloadHash(listingsapp.ListingToSignaturePayload(listing))
		if err != nil {
			return err
		}
		sig, err := w.humanSignatures.RecordSignature(ctx, signaturesapp.SignatureRepos{
			HumanSignatures:      repos.HumanSignatures,
			WorldIDVerifications: repos.WorldIDVerifications,
		}, signaturesapp.RecordSignatureInput{
			UserID:             in.SellerID,
			ActionType:         signaturesdomain.ActionListingPublish,
			ResourceType:       signaturesdomain.ResourceListing,
			ResourceID:         in.ListingID,
			PayloadHash:        payloadHash,
			ExpectedSignalHash: &payloadHash,
			Presence:           presence,
		})
		if err != nil {
			return err
		}
		if err := w.listingPub.PublishWithSignature(ctx, repos.Listings, listing, sig.SignatureID, sig.SignedAt); err != nil {
			return err
		}
		out = HumanSignatureResult{
			ListingID:             in.ListingID.String(),
			SignatureID:           sig.SignatureID.String(),
			WorldIDVerificationID: sig.WorldIDVerificationID.String(),
			VerificationCount:     sig.VerificationCount,
			Status:                "PUBLISHED",
		}
		return nil
	})
	if err != nil {
		return HumanSignatureResult{}, err
	}
	return out, nil
}

// --- UpdateListingWithHumanSignature ---

type UpdateListingInput struct {
	ListingID           uuid.UUID
	SellerID            uuid.UUID
	Fields              listingsdomain.ListingFields
	IdKit               signaturesapp.IdKitResult
	ExpectedEnvironment *string
}

type UpdateListingWithHumanSignatureWorkflow struct {
	tx              HumanSignatureTxRunner
	listingPub      listingsapp.ListingPublicationService
	humanSignatures *signaturesapp.HumanSignatureService
}

func NewUpdateListingWithHumanSignatureWorkflow(tx HumanSignatureTxRunner, pub listingsapp.ListingPublicationService, hs *signaturesapp.HumanSignatureService) *UpdateListingWithHumanSignatureWorkflow {
	return &UpdateListingWithHumanSignatureWorkflow{tx: tx, listingPub: pub, humanSignatures: hs}
}

func (w *UpdateListingWithHumanSignatureWorkflow) Execute(ctx context.Context, in UpdateListingInput) (HumanSignatureResult, error) {
	presence, err := w.humanSignatures.VerifyHumanPresence(ctx, signaturesapp.VerifyHumanPresenceInput{
		IdKit:               in.IdKit,
		ExpectedAction:      signaturesdomain.ActionListingUpdate,
		ExpectedEnvironment: in.ExpectedEnvironment,
	})
	if err != nil {
		return HumanSignatureResult{}, err
	}

	var out HumanSignatureResult
	err = w.tx.Run(ctx, func(ctx context.Context, repos HumanSignatureRepos) error {
		listing, err := w.listingPub.GetListingForSellerMutation(ctx, repos.Listings, in.ListingID, in.SellerID)
		if err != nil {
			return err
		}
		// 更新後fieldsに対するpayload hash（売り手/agentは現在値）。
		payload := listingsapp.SignaturePayloadFor(listing.ID(), listing.SellerID(), listing.AgentID(), in.Fields)
		payloadHash, err := listingsapp.ComputeListingPayloadHash(payload)
		if err != nil {
			return err
		}
		sig, err := w.humanSignatures.RecordSignature(ctx, signaturesapp.SignatureRepos{
			HumanSignatures:      repos.HumanSignatures,
			WorldIDVerifications: repos.WorldIDVerifications,
		}, signaturesapp.RecordSignatureInput{
			UserID:             in.SellerID,
			ActionType:         signaturesdomain.ActionListingUpdate,
			ResourceType:       signaturesdomain.ResourceListing,
			ResourceID:         in.ListingID,
			PayloadHash:        payloadHash,
			ExpectedSignalHash: &payloadHash,
			Presence:           presence,
		})
		if err != nil {
			return err
		}
		if err := w.listingPub.UpdateWithSignature(ctx, repos.Listings, listing, in.Fields, sig.SignatureID, sig.SignedAt); err != nil {
			return err
		}
		out = HumanSignatureResult{
			ListingID:             in.ListingID.String(),
			SignatureID:           sig.SignatureID.String(),
			WorldIDVerificationID: sig.WorldIDVerificationID.String(),
			VerificationCount:     sig.VerificationCount,
			Status:                "PUBLISHED",
		}
		return nil
	})
	if err != nil {
		return HumanSignatureResult{}, err
	}
	return out, nil
}
