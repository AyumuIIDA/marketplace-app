package workflows

import (
	"context"

	"github.com/google/uuid"

	ordersapp "marketplace/api-go/internal/modules/orders/application"
	ordersdomain "marketplace/api-go/internal/modules/orders/domain"
	reviewsapp "marketplace/api-go/internal/modules/reviews/application"
	reviewsdomain "marketplace/api-go/internal/modules/reviews/domain"
	signaturesapp "marketplace/api-go/internal/modules/signatures/application"
	signaturesdomain "marketplace/api-go/internal/modules/signatures/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/clock"
)

// ReviewRepos はレビューtransaction内で使うtx-bound repository群。
type ReviewRepos struct {
	Orders               ordersdomain.OrderRepository
	Reviews              reviewsdomain.ReviewRepository
	HumanSignatures      signaturesdomain.HumanSignatureRepository
	WorldIDVerifications signaturesdomain.WorldIdVerificationRepository
}

// ReviewTxRunner は1 transaction内でtx-bound repoを束ねてfnを実行するport。
type ReviewTxRunner interface {
	Run(ctx context.Context, fn func(ctx context.Context, repos ReviewRepos) error) error
}

// --- CreateReview ---

type CreateReviewInput struct {
	OrderID    uuid.UUID
	ReviewerID uuid.UUID
	Rating     int32
	Comment    string
	AgentID    *uuid.UUID
}

type CreateReviewWorkflow struct {
	tx               ReviewTxRunner
	orderFulfillment *ordersapp.OrderFulfillmentService
	create           *reviewsapp.CreateReviewService
}

func NewCreateReviewWorkflow(tx ReviewTxRunner, of *ordersapp.OrderFulfillmentService, create *reviewsapp.CreateReviewService) *CreateReviewWorkflow {
	return &CreateReviewWorkflow{tx: tx, orderFulfillment: of, create: create}
}

func (w *CreateReviewWorkflow) Execute(ctx context.Context, in CreateReviewInput) (reviewsapp.ReviewView, error) {
	var out reviewsapp.ReviewView
	err := w.tx.Run(ctx, func(ctx context.Context, repos ReviewRepos) error {
		order, err := w.orderFulfillment.GetOrderForParticipant(ctx, repos.Orders, in.OrderID, in.ReviewerID)
		if err != nil {
			return err
		}
		if order.Status() != ordersdomain.OrderStatusReceived && order.Status() != ordersdomain.OrderStatusCompleted {
			return apperr.Forbidden("Reviews can be created after the order is received.")
		}
		revieweeID := order.SellerID()
		if in.ReviewerID == order.SellerID() {
			revieweeID = order.BuyerID()
		}
		v, err := w.create.CreateDraft(ctx, repos.Reviews, reviewsapp.CreateReviewInput{
			OrderID:    in.OrderID,
			ReviewerID: in.ReviewerID,
			RevieweeID: revieweeID,
			AgentID:    in.AgentID,
			Rating:     in.Rating,
			Comment:    in.Comment,
		})
		if err != nil {
			return err
		}
		out = v
		return nil
	})
	if err != nil {
		return reviewsapp.ReviewView{}, err
	}
	return out, nil
}

// --- SubmitReviewWithHumanSignature ---

type SubmitReviewInput struct {
	ReviewID            uuid.UUID
	ReviewerID          uuid.UUID
	IdKit               signaturesapp.IdKitResult
	ExpectedEnvironment *string
}

type SubmitReviewResult struct {
	Review                reviewsapp.ReviewView `json:"review"`
	SignatureID           string                `json:"signatureId"`
	WorldIDVerificationID string                `json:"worldIdVerificationId"`
	VerificationCount     int64                 `json:"verificationCount"`
	OrderCompleted        bool                  `json:"orderCompleted"`
}

type SubmitReviewWithHumanSignatureWorkflow struct {
	tx               ReviewTxRunner
	reviewSubmission reviewsapp.ReviewSubmissionService
	humanSignatures  *signaturesapp.HumanSignatureService
	orderFulfillment *ordersapp.OrderFulfillmentService
	clock            clock.Clock
}

func NewSubmitReviewWithHumanSignatureWorkflow(tx ReviewTxRunner, rs reviewsapp.ReviewSubmissionService, hs *signaturesapp.HumanSignatureService, of *ordersapp.OrderFulfillmentService, c clock.Clock) *SubmitReviewWithHumanSignatureWorkflow {
	return &SubmitReviewWithHumanSignatureWorkflow{tx: tx, reviewSubmission: rs, humanSignatures: hs, orderFulfillment: of, clock: c}
}

func (w *SubmitReviewWithHumanSignatureWorkflow) Execute(ctx context.Context, in SubmitReviewInput) (SubmitReviewResult, error) {
	// Phase 1: World ID検証（tx外）。
	presence, err := w.humanSignatures.VerifyHumanPresence(ctx, signaturesapp.VerifyHumanPresenceInput{
		IdKit:               in.IdKit,
		ExpectedAction:      signaturesdomain.ActionReviewSubmit,
		ExpectedEnvironment: in.ExpectedEnvironment,
	})
	if err != nil {
		return SubmitReviewResult{}, err
	}

	var out SubmitReviewResult
	err = w.tx.Run(ctx, func(ctx context.Context, repos ReviewRepos) error {
		review, err := w.reviewSubmission.GetReviewForSubmission(ctx, repos.Reviews, in.ReviewID, in.ReviewerID)
		if err != nil {
			return err
		}
		payloadHash, err := reviewsapp.ComputeReviewPayloadHash(reviewsapp.ReviewToSignaturePayload(review))
		if err != nil {
			return err
		}
		sig, err := w.humanSignatures.RecordSignature(ctx, signaturesapp.SignatureRepos{
			HumanSignatures:      repos.HumanSignatures,
			WorldIDVerifications: repos.WorldIDVerifications,
		}, signaturesapp.RecordSignatureInput{
			UserID:             in.ReviewerID,
			ActionType:         signaturesdomain.ActionReviewSubmit,
			ResourceType:       signaturesdomain.ResourceReview,
			ResourceID:         in.ReviewID,
			PayloadHash:        payloadHash,
			ExpectedSignalHash: &payloadHash,
			Presence:           presence,
		})
		if err != nil {
			return err
		}
		submitted, err := w.reviewSubmission.SubmitWithSignature(ctx, repos.Reviews, review, sig.SignatureID, sig.SignedAt)
		if err != nil {
			return err
		}

		// 双方(買い手/売り手)が提出済みかつ注文がRECEIVEDなら注文を完了にする。
		orderCompleted, err := w.maybeCompleteOrder(ctx, repos, review.OrderID(), in.ReviewerID)
		if err != nil {
			return err
		}

		out = SubmitReviewResult{
			Review:                submitted,
			SignatureID:           sig.SignatureID.String(),
			WorldIDVerificationID: sig.WorldIDVerificationID.String(),
			VerificationCount:     sig.VerificationCount,
			OrderCompleted:        orderCompleted,
		}
		return nil
	})
	if err != nil {
		return SubmitReviewResult{}, err
	}
	return out, nil
}

func (w *SubmitReviewWithHumanSignatureWorkflow) maybeCompleteOrder(ctx context.Context, repos ReviewRepos, orderID, reviewerID uuid.UUID) (bool, error) {
	order, err := w.orderFulfillment.GetOrderForParticipant(ctx, repos.Orders, orderID, reviewerID)
	if err != nil {
		return false, err
	}
	if order.Status() != ordersdomain.OrderStatusReceived {
		return false, nil
	}
	submittedStatus := reviewsdomain.ReviewStatusSubmitted
	submitted, err := repos.Reviews.Search(ctx, reviewsdomain.SearchInput{OrderID: &orderID, Status: &submittedStatus})
	if err != nil {
		return false, err
	}
	reviewers := make(map[uuid.UUID]bool, len(submitted))
	for _, r := range submitted {
		reviewers[r.ReviewerID()] = true
	}
	if !reviewers[order.BuyerID()] || !reviewers[order.SellerID()] {
		return false, nil
	}
	if err := order.CompleteAfterReviews(w.clock.Now()); err != nil {
		return false, err
	}
	if err := repos.Orders.Save(ctx, order); err != nil {
		return false, err
	}
	return true, nil
}
