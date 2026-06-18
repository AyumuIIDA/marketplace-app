// Package reviewsapp はレビューのUseCase/Serviceを実装する。
package reviewsapp

import (
	"context"
	"time"

	"github.com/google/uuid"

	reviewsdomain "marketplace/api-go/internal/modules/reviews/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/clock"
	"marketplace/api-go/internal/shared/ids"
)

// ReviewView はレビューの応答表現（既存フロント互換のcamelCase）。
type ReviewView struct {
	ReviewID    string     `json:"reviewId"`
	OrderID     string     `json:"orderId"`
	ReviewerID  string     `json:"reviewerId"`
	RevieweeID  string     `json:"revieweeId"`
	AgentID     *string    `json:"agentId,omitempty"`
	Rating      int32      `json:"rating"`
	Comment     string     `json:"comment"`
	Status      string     `json:"status"`
	SignatureID *string    `json:"signatureId,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	SubmittedAt *time.Time `json:"submittedAt,omitempty"`
	HiddenAt    *time.Time `json:"hiddenAt,omitempty"`
}

func PresentReview(r *reviewsdomain.Review) ReviewView {
	var agentID, signatureID *string
	if r.AgentID() != nil {
		s := r.AgentID().String()
		agentID = &s
	}
	if r.SignatureID() != nil {
		s := r.SignatureID().String()
		signatureID = &s
	}
	return ReviewView{
		ReviewID:    r.ID().String(),
		OrderID:     r.OrderID().String(),
		ReviewerID:  r.ReviewerID().String(),
		RevieweeID:  r.RevieweeID().String(),
		AgentID:     agentID,
		Rating:      r.Rating(),
		Comment:     r.Comment(),
		Status:      string(r.Status()),
		SignatureID: signatureID,
		CreatedAt:   r.CreatedAt(),
		SubmittedAt: r.SubmittedAt(),
		HiddenAt:    r.HiddenAt(),
	}
}

// --- CreateReviewService（workflowからtx-bound repoを受け取って下書き作成）---

type CreateReviewInput struct {
	OrderID    uuid.UUID
	ReviewerID uuid.UUID
	RevieweeID uuid.UUID
	AgentID    *uuid.UUID
	Rating     int32
	Comment    string
}

type CreateReviewService struct {
	ids   ids.Generator
	clock clock.Clock
}

func NewCreateReviewService(g ids.Generator, c clock.Clock) *CreateReviewService {
	return &CreateReviewService{ids: g, clock: c}
}

func (s *CreateReviewService) CreateDraft(ctx context.Context, repo reviewsdomain.ReviewRepository, in CreateReviewInput) (ReviewView, error) {
	existing, err := repo.FindSubmittedByOrderReviewer(ctx, in.OrderID, in.ReviewerID)
	if err != nil {
		return ReviewView{}, err
	}
	if existing != nil {
		return ReviewView{}, apperr.Forbidden("A submitted review already exists for this order reviewer.")
	}
	review, err := reviewsdomain.NewDraft(reviewsdomain.CreateDraftReviewInput{
		ID:         s.ids.NewID(),
		OrderID:    in.OrderID,
		ReviewerID: in.ReviewerID,
		RevieweeID: in.RevieweeID,
		AgentID:    in.AgentID,
		Rating:     in.Rating,
		Comment:    in.Comment,
		Now:        s.clock.Now(),
	})
	if err != nil {
		return ReviewView{}, err
	}
	if err := repo.Save(ctx, review); err != nil {
		return ReviewView{}, err
	}
	return PresentReview(review), nil
}

// --- ReviewSubmissionService ---

type ReviewSubmissionService struct{}

func NewReviewSubmissionService() ReviewSubmissionService { return ReviewSubmissionService{} }

// GetReviewForSubmission はレビューを取得し、本人(reviewer)のみ提出を許可する。
func (ReviewSubmissionService) GetReviewForSubmission(ctx context.Context, repo reviewsdomain.ReviewRepository, reviewID, reviewerID uuid.UUID) (*reviewsdomain.Review, error) {
	review, err := repo.FindByID(ctx, reviewID)
	if err != nil {
		return nil, err
	}
	if review == nil {
		return nil, apperr.NotFound("Review", reviewID.String())
	}
	if review.ReviewerID() != reviewerID {
		return nil, apperr.Forbidden("Only the reviewer can submit this review.")
	}
	return review, nil
}

func (ReviewSubmissionService) SubmitWithSignature(ctx context.Context, repo reviewsdomain.ReviewRepository, review *reviewsdomain.Review, signatureID uuid.UUID, signedAt time.Time) (ReviewView, error) {
	if err := review.SubmitWithSignature(signatureID, signedAt); err != nil {
		return ReviewView{}, err
	}
	if err := repo.Save(ctx, review); err != nil {
		return ReviewView{}, err
	}
	return PresentReview(review), nil
}

// --- ListReviews（公開・pool repo）---

type ListReviewsInput struct {
	OrderID    *uuid.UUID
	ReviewerID *uuid.UUID
	RevieweeID *uuid.UUID
	Status     *reviewsdomain.ReviewStatus
	Limit      *int32
}

type ListReviewsResult struct {
	Items []ReviewView `json:"items"`
}

type ListReviewsUseCase struct {
	repo reviewsdomain.ReviewRepository
}

func NewListReviewsUseCase(repo reviewsdomain.ReviewRepository) *ListReviewsUseCase {
	return &ListReviewsUseCase{repo: repo}
}

func (uc *ListReviewsUseCase) Execute(ctx context.Context, in ListReviewsInput) (ListReviewsResult, error) {
	// 既定は SUBMITTED のみ公開（TS互換）。
	status := in.Status
	if status == nil {
		s := reviewsdomain.ReviewStatusSubmitted
		status = &s
	}
	reviews, err := uc.repo.Search(ctx, reviewsdomain.SearchInput{
		OrderID:    in.OrderID,
		ReviewerID: in.ReviewerID,
		RevieweeID: in.RevieweeID,
		Status:     status,
		Limit:      in.Limit,
	})
	if err != nil {
		return ListReviewsResult{}, err
	}
	items := make([]ReviewView, 0, len(reviews))
	for _, r := range reviews {
		items = append(items, PresentReview(r))
	}
	return ListReviewsResult{Items: items}, nil
}
