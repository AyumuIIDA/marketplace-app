// Package identityhttp はidentityのHTTP adapter（/me 系）。
package identityhttp

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/outarc/marketplace/api-go/internal/interface/http"
	identityapp "github.com/outarc/marketplace/api-go/internal/modules/identity/application"
	signaturesapp "github.com/outarc/marketplace/api-go/internal/modules/signatures/application"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// Deps はidentity HTTPの依存（UseCase群）。
type Deps struct {
	GetCurrentUser    *identityapp.GetCurrentUserUseCase
	UpsertCurrentUser *identityapp.UpsertCurrentUserUseCase
	LinkWorldID       *identityapp.LinkWorldIDUseCase
}

// RegisterRoutes は認証済みルートグループへ /me 系を登録する。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Get("/me", deps.handleGetMe)
	r.Put("/me", deps.handlePutMe)
	r.Post("/me/world-id", deps.handleLinkWorldID)
}

type linkWorldIDRequest struct {
	IdKitResult         signaturesapp.IdKitResult `json:"idKitResult"`
	ExpectedEnvironment *string                   `json:"expectedEnvironment"`
}

func (deps Deps) handleLinkWorldID(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body linkWorldIDRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.LinkWorldID.Execute(r.Context(), identityapp.LinkWorldIDInput{
		UserID:              userID,
		IdKit:               body.IdKitResult,
		ExpectedEnvironment: body.ExpectedEnvironment,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleGetMe(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.GetCurrentUser.Execute(r.Context(), userID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

type upsertMeRequest struct {
	DisplayName string  `json:"displayName" validate:"required"`
	Email       string  `json:"email" validate:"required,email"`
	AvatarURL   *string `json:"avatarUrl" validate:"omitempty,url"`
}

func (deps Deps) handlePutMe(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body upsertMeRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	if strings.TrimSpace(body.DisplayName) == "" {
		httpinterface.WriteError(w, r, apperr.Validation("displayName is required.",
			apperr.FieldError{Field: "displayName", Reason: "required"}))
		return
	}
	out, err := deps.UpsertCurrentUser.Execute(r.Context(), identityapp.UpsertCurrentUserInput{
		UserID:      userID,
		DisplayName: strings.TrimSpace(body.DisplayName),
		Email:       body.Email,
		AvatarURL:   body.AvatarURL,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}
