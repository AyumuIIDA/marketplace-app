// Package aihttp はAI支援のHTTP adapter（/ai-assistance 系）。
package aihttp

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	httpinterface "github.com/outarc/marketplace/api-go/internal/interface/http"
	aiapp "github.com/outarc/marketplace/api-go/internal/modules/aiassistance/application"
)

// Deps はAI支援HTTPの依存。
type Deps struct {
	SuggestListingFields *aiapp.SuggestListingFieldsUseCase
}

// RegisterRoutes は認証済みグループへ /ai-assistance 系を登録する。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Post("/ai-assistance/listing-fields", deps.handleSuggestListingFields)
}

type suggestListingFieldsRequest struct {
	UserHint  *string  `json:"userHint"`
	ImageURLs []string `json:"imageUrls" validate:"required,min=1,max=10,dive,url"`
}

func (deps Deps) handleSuggestListingFields(w http.ResponseWriter, r *http.Request) {
	if _, err := httpinterface.CurrentUserID(r); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body suggestListingFieldsRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.SuggestListingFields.Execute(r.Context(), aiapp.SuggestListingFieldsInput{
		UserHint:  body.UserHint,
		ImageURLs: body.ImageURLs,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}
