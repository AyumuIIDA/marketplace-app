// Package reviewsdomain はレビュー(review)のdomainモデルとrepository portを定義する。
package reviewsdomain

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"marketplace/api-go/internal/shared/apperr"
)

// ReviewStatus はレビューの状態。
type ReviewStatus string

const (
	ReviewStatusDraft     ReviewStatus = "DRAFT"
	ReviewStatusSubmitted ReviewStatus = "SUBMITTED"
	ReviewStatusHidden    ReviewStatus = "HIDDEN"
)

// Review はレビューのEntity。下書き→署名付き提出→（非表示）の状態遷移を持つ。
type Review struct {
	id          uuid.UUID
	orderID     uuid.UUID
	reviewerID  uuid.UUID
	revieweeID  uuid.UUID
	agentID     *uuid.UUID
	rating      int32
	comment     string
	status      ReviewStatus
	signatureID *uuid.UUID
	createdAt   time.Time
	submittedAt *time.Time
	hiddenAt    *time.Time
}

type CreateDraftReviewInput struct {
	ID         uuid.UUID
	OrderID    uuid.UUID
	ReviewerID uuid.UUID
	RevieweeID uuid.UUID
	AgentID    *uuid.UUID
	Rating     int32
	Comment    string
	Now        time.Time
}

// NewDraft は不変条件を検証して下書きレビュー(status=DRAFT)を生成する。
func NewDraft(in CreateDraftReviewInput) (*Review, error) {
	if in.ReviewerID == in.RevieweeID {
		return nil, apperr.Domain("REVIEW_SELF_REVIEW_NOT_ALLOWED", "Reviewer and reviewee must be different.")
	}
	if err := validateRating(in.Rating); err != nil {
		return nil, err
	}
	if err := validateComment(in.Comment); err != nil {
		return nil, err
	}
	return &Review{
		id:         in.ID,
		orderID:    in.OrderID,
		reviewerID: in.ReviewerID,
		revieweeID: in.RevieweeID,
		agentID:    in.AgentID,
		rating:     in.Rating,
		comment:    in.Comment,
		status:     ReviewStatusDraft,
		createdAt:  in.Now,
	}, nil
}

type RehydrateInput struct {
	ID          uuid.UUID
	OrderID     uuid.UUID
	ReviewerID  uuid.UUID
	RevieweeID  uuid.UUID
	AgentID     *uuid.UUID
	Rating      int32
	Comment     string
	Status      ReviewStatus
	SignatureID *uuid.UUID
	CreatedAt   time.Time
	SubmittedAt *time.Time
	HiddenAt    *time.Time
}

func Rehydrate(in RehydrateInput) *Review {
	return &Review{
		id:          in.ID,
		orderID:     in.OrderID,
		reviewerID:  in.ReviewerID,
		revieweeID:  in.RevieweeID,
		agentID:     in.AgentID,
		rating:      in.Rating,
		comment:     in.Comment,
		status:      in.Status,
		signatureID: in.SignatureID,
		createdAt:   in.CreatedAt,
		submittedAt: in.SubmittedAt,
		hiddenAt:    in.HiddenAt,
	}
}

func (r *Review) ID() uuid.UUID           { return r.id }
func (r *Review) OrderID() uuid.UUID      { return r.orderID }
func (r *Review) ReviewerID() uuid.UUID   { return r.reviewerID }
func (r *Review) RevieweeID() uuid.UUID   { return r.revieweeID }
func (r *Review) AgentID() *uuid.UUID     { return r.agentID }
func (r *Review) Rating() int32           { return r.rating }
func (r *Review) Comment() string         { return r.comment }
func (r *Review) Status() ReviewStatus    { return r.status }
func (r *Review) SignatureID() *uuid.UUID { return r.signatureID }
func (r *Review) CreatedAt() time.Time    { return r.createdAt }
func (r *Review) SubmittedAt() *time.Time { return r.submittedAt }
func (r *Review) HiddenAt() *time.Time    { return r.hiddenAt }

// SubmitWithSignature は下書きのみ可。human signatureを付けて提出済みにする。
func (r *Review) SubmitWithSignature(signatureID uuid.UUID, submittedAt time.Time) error {
	if r.status != ReviewStatusDraft {
		return apperr.Domain("REVIEW_NOT_SUBMITTABLE", "Only draft reviews can be submitted.")
	}
	r.status = ReviewStatusSubmitted
	r.signatureID = &signatureID
	r.submittedAt = &submittedAt
	return nil
}

func validateRating(rating int32) error {
	if rating < 1 || rating > 5 {
		return apperr.Domain("REVIEW_RATING_INVALID", "Review rating must be an integer between 1 and 5.",
			apperr.FieldError{Field: "rating", Reason: "range"})
	}
	return nil
}

func validateComment(comment string) error {
	if strings.TrimSpace(comment) == "" {
		return apperr.Domain("REVIEW_COMMENT_REQUIRED", "Review comment is required.",
			apperr.FieldError{Field: "comment", Reason: "required"})
	}
	return nil
}

// SearchInput はレビューの有界検索条件。
type SearchInput struct {
	OrderID    *uuid.UUID
	ReviewerID *uuid.UUID
	RevieweeID *uuid.UUID
	Status     *ReviewStatus
	Limit      *int32
}

// ReviewRepository はレビューの永続化port。見つからない場合は (nil, nil)。
type ReviewRepository interface {
	Save(ctx context.Context, review *Review) error
	FindByID(ctx context.Context, id uuid.UUID) (*Review, error)
	FindSubmittedByOrderReviewer(ctx context.Context, orderID, reviewerID uuid.UUID) (*Review, error)
	Search(ctx context.Context, in SearchInput) ([]*Review, error)
}
