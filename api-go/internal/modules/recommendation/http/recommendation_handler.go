// Package recommendationhttp は意味検索/類似のHTTP adapter（/recommendations 系）。
package recommendationhttp

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/outarc/marketplace/api-go/internal/app/workflows"
	httpinterface "github.com/outarc/marketplace/api-go/internal/interface/http"
	recommendationapp "github.com/outarc/marketplace/api-go/internal/modules/recommendation/application"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// defaultTopK は limit 未指定時の近傍件数。
const defaultTopK int32 = 24

// Deps は recommendation HTTP の依存（合成workflow）。
type Deps struct {
	Search  *workflows.SemanticSearchWorkflow
	Similar *workflows.SimilarListingsWorkflow
}

// RegisterRoutes は /recommendations 系を認証済みグループへ登録する。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Route("/recommendations", func(rr chi.Router) {
		rr.Get("/search", deps.handleSearch)
		rr.Get("/similar/{listingId}", deps.handleSimilar)
	})
}

func (deps Deps) handleSearch(w http.ResponseWriter, r *http.Request) {
	requesterID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	q := r.URL.Query()

	query := strings.TrimSpace(q.Get("q"))
	if query == "" {
		httpinterface.WriteError(w, r, apperr.Validation("q is required.",
			apperr.FieldError{Field: "q", Reason: "required"}))
		return
	}

	minPrice, err := optionalPositiveInt(q.Get("minPrice"), "minPrice")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	maxPrice, err := optionalPositiveInt(q.Get("maxPrice"), "maxPrice")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	topK, err := optionalTopK(q.Get("limit"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}

	filter := recommendationapp.SearchFilter{MinPrice: minPrice, MaxPrice: maxPrice}
	if c := httpinterface.OptionalStr(q.Get("category")); c != nil {
		filter.Categories = []string{*c}
	}

	rid := requesterID
	out, err := deps.Search.Execute(r.Context(), query, filter, topK, &rid)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleSimilar(w http.ResponseWriter, r *http.Request) {
	requesterID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	listingID, err := httpinterface.PathUUID(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	topK, err := optionalTopK(r.URL.Query().Get("limit"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}

	rid := requesterID
	out, err := deps.Similar.Execute(r.Context(), listingID, topK, &rid)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

// optionalTopK は limit を 1..100 で解釈し、未指定なら defaultTopK を返す。
func optionalTopK(s string) (int32, error) {
	n, err := httpinterface.OptionalLimit(s)
	if err != nil {
		return 0, err
	}
	if n == nil {
		return defaultTopK, nil
	}
	return *n, nil
}

func optionalPositiveInt(s, field string) (*int32, error) {
	if strings.TrimSpace(s) == "" {
		return nil, nil
	}
	v, err := strconv.Atoi(strings.TrimSpace(s))
	if err != nil || v <= 0 {
		return nil, apperr.Validation(field+" must be a positive integer.",
			apperr.FieldError{Field: field, Reason: "positive_int"})
	}
	n := int32(v)
	return &n, nil
}
