// Package reviewshttp はレビューのHTTP adapter（/reviews 系）。
package reviewshttp

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"marketplace/api-go/internal/app/workflows"
	httpinterface "marketplace/api-go/internal/interface/http"
	reviewsapp "marketplace/api-go/internal/modules/reviews/application"
	reviewsdomain "marketplace/api-go/internal/modules/reviews/domain"
	signaturesapp "marketplace/api-go/internal/modules/signatures/application"
	"marketplace/api-go/internal/shared/apperr"
)

// Deps はレビューHTTPの依存。
type Deps struct {
	List   *reviewsapp.ListReviewsUseCase
	Create *workflows.CreateReviewWorkflow
	Submit *workflows.SubmitReviewWithHumanSignatureWorkflow
}

// RegisterPublicRoutes は認証不要の GET /reviews を登録する。
func RegisterPublicRoutes(r chi.Router, deps Deps) {
	r.Get("/reviews", deps.handleList)
}

// RegisterRoutes は認証済みの作成/提出を登録する。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Post("/reviews", deps.handleCreate)
	r.Post("/reviews/{reviewId}/submit", deps.handleSubmit)
}

func (deps Deps) handleList(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	orderID, err := optionalUUID(q.Get("orderId"), "orderId")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	revieweeID, err := optionalUUID(q.Get("revieweeId"), "revieweeId")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	reviewerID, err := optionalUUID(q.Get("reviewerId"), "reviewerId")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	status, err := optionalReviewStatus(q.Get("status"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	limit, err := httpinterface.OptionalLimit(q.Get("limit"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.List.Execute(r.Context(), reviewsapp.ListReviewsInput{
		OrderID:    orderID,
		RevieweeID: revieweeID,
		ReviewerID: reviewerID,
		Status:     status,
		Limit:      limit,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

type createReviewRequest struct {
	OrderID string  `json:"orderId" validate:"required"`
	Rating  int32   `json:"rating" validate:"required,min=1,max=5"`
	Comment string  `json:"comment" validate:"required"`
	AgentID *string `json:"agentId"`
}

func (deps Deps) handleCreate(w http.ResponseWriter, r *http.Request) {
	reviewerID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body createReviewRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	orderID, err := requiredUUID(body.OrderID, "orderId")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	agentID, err := optionalUUIDPtr(body.AgentID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Create.Execute(r.Context(), workflows.CreateReviewInput{
		OrderID:    orderID,
		ReviewerID: reviewerID,
		Rating:     body.Rating,
		Comment:    strings.TrimSpace(body.Comment),
		AgentID:    agentID,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusCreated, out)
}

type submitReviewRequest struct {
	IdKitResult         signaturesapp.IdKitResult `json:"idKitResult"`
	ExpectedEnvironment *string                   `json:"expectedEnvironment"`
}

func (deps Deps) handleSubmit(w http.ResponseWriter, r *http.Request) {
	reviewerID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	reviewID, err := httpinterface.PathUUID(r, "reviewId", "Review")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body submitReviewRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Submit.Execute(r.Context(), workflows.SubmitReviewInput{
		ReviewID:            reviewID,
		ReviewerID:          reviewerID,
		IdKit:               body.IdKitResult,
		ExpectedEnvironment: body.ExpectedEnvironment,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

// --- helpers ---

func optionalUUID(s, field string) (*uuid.UUID, error) {
	if strings.TrimSpace(s) == "" {
		return nil, nil
	}
	id, err := uuid.Parse(strings.TrimSpace(s))
	if err != nil {
		return nil, apperr.Validation(field+" must be a valid id.", apperr.FieldError{Field: field, Reason: "invalid"})
	}
	return &id, nil
}

func optionalUUIDPtr(s *string) (*uuid.UUID, error) {
	if s == nil {
		return nil, nil
	}
	return optionalUUID(*s, "agentId")
}

func requiredUUID(s, field string) (uuid.UUID, error) {
	id, err := uuid.Parse(strings.TrimSpace(s))
	if err != nil {
		return uuid.Nil, apperr.Validation(field+" must be a valid id.", apperr.FieldError{Field: field, Reason: "invalid"})
	}
	return id, nil
}

func optionalReviewStatus(s string) (*reviewsdomain.ReviewStatus, error) {
	if s == "" {
		return nil, nil
	}
	switch reviewsdomain.ReviewStatus(s) {
	case reviewsdomain.ReviewStatusDraft, reviewsdomain.ReviewStatusSubmitted, reviewsdomain.ReviewStatusHidden:
		st := reviewsdomain.ReviewStatus(s)
		return &st, nil
	default:
		return nil, apperr.Validation("status is invalid.", apperr.FieldError{Field: "status", Reason: "enum"})
	}
}
