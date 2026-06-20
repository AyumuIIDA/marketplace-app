// Package socialhttp は social（いいね/出品者サマリ）のHTTP adapter。
package socialhttp

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"marketplace/api-go/internal/app/workflows"
	httpinterface "marketplace/api-go/internal/interface/http"
	socialapp "marketplace/api-go/internal/modules/social/application"
	"marketplace/api-go/internal/shared/apperr"
)

// defaultPageLimit はいいね一覧の既定ページサイズ。
const defaultPageLimit int32 = 24

// Deps は social HTTPの依存（UseCase / Workflow）。
type Deps struct {
	ListingLike   *socialapp.ListingLikeUseCase
	SellerLike    *socialapp.SellerLikeUseCase
	SellerSummary *socialapp.GetSellerSummaryUseCase
	LikedListings *workflows.LikedListingsWorkflow
	LikedSellers  *socialapp.ListLikedSellersUseCase
	CreateComment *socialapp.CreateListingCommentUseCase
	ListComments  *socialapp.ListListingCommentsUseCase
	// 私的レイヤー（保存/フォロー。認証不要）。
	SaveListing     *socialapp.SaveListingUseCase
	SavedListings   *workflows.LikedListingsWorkflow // 保存ID→本体hydrate（いいね一覧と同workflowを流用）
	FollowSeller    *socialapp.FollowSellerUseCase
	FollowedSellers *socialapp.ListFollowedSellersUseCase
}

// RegisterRoutes は social 系を認証済みグループへ登録する。
// 商品いいねは /listings 配下（listings の mount と共存する直接ルート）、
// 出品者系は /sellers、いいね一覧は /me 配下に置く。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Post("/listings/{listingId}/like", deps.handleLikeListing)
	r.Delete("/listings/{listingId}/like", deps.handleUnlikeListing)
	r.Post("/listings/{listingId}/save", deps.handleSaveListing)
	r.Delete("/listings/{listingId}/save", deps.handleUnsaveListing)
	r.Get("/listings/{listingId}/comments", deps.handleListComments)
	r.Post("/listings/{listingId}/comments", deps.handleCreateComment)
	r.Get("/me/liked-listings", deps.handleLikedListings)
	r.Get("/me/liked-sellers", deps.handleLikedSellers)
	r.Get("/me/saved-listings", deps.handleSavedListings)
	r.Get("/me/following", deps.handleFollowedSellers)
	r.Route("/sellers", func(sr chi.Router) {
		sr.Get("/{sellerId}", deps.handleGetSeller)
		sr.Post("/{sellerId}/like", deps.handleLikeSeller)
		sr.Delete("/{sellerId}/like", deps.handleUnlikeSeller)
		sr.Post("/{sellerId}/follow", deps.handleFollowSeller)
		sr.Delete("/{sellerId}/follow", deps.handleUnfollowSeller)
	})
}

func (deps Deps) handleLikeListing(w http.ResponseWriter, r *http.Request) {
	userID, listingID, err := userAndPath(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.ListingLike.Like(r.Context(), userID, listingID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleUnlikeListing(w http.ResponseWriter, r *http.Request) {
	userID, listingID, err := userAndPath(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.ListingLike.Unlike(r.Context(), userID, listingID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleLikeSeller(w http.ResponseWriter, r *http.Request) {
	userID, sellerID, err := userAndPath(r, "sellerId", "Seller")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.SellerLike.Like(r.Context(), userID, sellerID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleUnlikeSeller(w http.ResponseWriter, r *http.Request) {
	userID, sellerID, err := userAndPath(r, "sellerId", "Seller")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.SellerLike.Unlike(r.Context(), userID, sellerID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

// --- 保存（商品の私的ウォッチリスト） ---

func (deps Deps) handleSaveListing(w http.ResponseWriter, r *http.Request) {
	userID, listingID, err := userAndPath(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.SaveListing.Save(r.Context(), userID, listingID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleUnsaveListing(w http.ResponseWriter, r *http.Request) {
	userID, listingID, err := userAndPath(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.SaveListing.Unsave(r.Context(), userID, listingID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleSavedListings(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	limit, offset, err := pageParams(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.SavedListings.Execute(r.Context(), userID, limit, offset)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

// --- フォロー（出品者の私的フォロー） ---

func (deps Deps) handleFollowSeller(w http.ResponseWriter, r *http.Request) {
	userID, sellerID, err := userAndPath(r, "sellerId", "Seller")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.FollowSeller.Follow(r.Context(), userID, sellerID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleUnfollowSeller(w http.ResponseWriter, r *http.Request) {
	userID, sellerID, err := userAndPath(r, "sellerId", "Seller")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.FollowSeller.Unfollow(r.Context(), userID, sellerID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleFollowedSellers(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	limit, offset, err := pageParams(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.FollowedSellers.Execute(r.Context(), userID, limit, offset)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleGetSeller(w http.ResponseWriter, r *http.Request) {
	viewerID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	sellerID, err := httpinterface.PathUUID(r, "sellerId", "Seller")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	vid := viewerID
	out, err := deps.SellerSummary.Execute(r.Context(), sellerID, &vid)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleLikedListings(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	limit, offset, err := pageParams(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.LikedListings.Execute(r.Context(), userID, limit, offset)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleLikedSellers(w http.ResponseWriter, r *http.Request) {
	userID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	limit, offset, err := pageParams(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.LikedSellers.Execute(r.Context(), userID, limit, offset)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

type createCommentRequest struct {
	Body string `json:"body" validate:"required,min=1,max=1000"`
}

func (deps Deps) handleCreateComment(w http.ResponseWriter, r *http.Request) {
	userID, listingID, err := userAndPath(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body createCommentRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.CreateComment.Execute(r.Context(), listingID, userID, strings.TrimSpace(body.Body))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusCreated, out)
}

func (deps Deps) handleListComments(w http.ResponseWriter, r *http.Request) {
	listingID, err := httpinterface.PathUUID(r, "listingId", "Listing")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	limit, offset, err := pageParams(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.ListComments.Execute(r.Context(), listingID, limit, offset)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

// --- helpers ---

// userAndPath は現在ユーザ(uuid)とpath param(uuid)をまとめて解決する。
func userAndPath(r *http.Request, key, resourceLabel string) (userID, target uuid.UUID, err error) {
	userID, err = httpinterface.CurrentUserID(r)
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	target, err = httpinterface.PathUUID(r, key, resourceLabel)
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	return userID, target, nil
}

// pageParams は limit(1..100, 既定24) と offset(>=0, 既定0) を解釈する。
func pageParams(r *http.Request) (limit, offset int32, err error) {
	q := r.URL.Query()
	limit = defaultPageLimit
	if l, lerr := httpinterface.OptionalLimit(q.Get("limit")); lerr != nil {
		return 0, 0, lerr
	} else if l != nil {
		limit = *l
	}
	if raw := strings.TrimSpace(q.Get("offset")); raw != "" {
		v, perr := strconv.Atoi(raw)
		if perr != nil || v < 0 {
			return 0, 0, apperr.Validation("offset must be a non-negative integer.",
				apperr.FieldError{Field: "offset", Reason: "non_negative_int"})
		}
		offset = int32(v)
	}
	return limit, offset, nil
}
