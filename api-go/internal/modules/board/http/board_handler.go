// Package boardhttp は掲示板のHTTP adapter（/board 系）。閲覧は公開・投稿/返信は認証必須。
package boardhttp

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	httpinterface "marketplace/api-go/internal/interface/http"
	boardapp "marketplace/api-go/internal/modules/board/application"
)

// Deps は掲示板HTTPの依存。
type Deps struct {
	List  *boardapp.ListPostsUseCase
	Get   *boardapp.GetPostUseCase
	Post  *boardapp.CreatePostUseCase
	Reply *boardapp.AddReplyUseCase
}

// RegisterPublicRoutes は閲覧系（認証不要）を登録する。
func RegisterPublicRoutes(r chi.Router, deps Deps) {
	r.Get("/board", deps.handleList)
	r.Get("/board/{postId}", deps.handleGet)
}

// RegisterRoutes は投稿系（認証必須＝usecaseで humanVerified を強制）を登録する。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Post("/board", deps.handleCreate)
	r.Post("/board/{postId}/replies", deps.handleReply)
}

func (deps Deps) handleList(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit := int32(50)
	if v, err := strconv.Atoi(q.Get("limit")); err == nil && v > 0 && v <= 100 {
		limit = int32(v)
	}
	offset := int32(0)
	if v, err := strconv.Atoi(q.Get("offset")); err == nil && v > 0 {
		offset = int32(v)
	}
	out, err := deps.List.Execute(r.Context(), limit, offset)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleGet(w http.ResponseWriter, r *http.Request) {
	postID, err := httpinterface.PathUUID(r, "postId", "BoardPost")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Get.Execute(r.Context(), postID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

type createPostRequest struct {
	Title string `json:"title" validate:"required"`
	Body  string `json:"body" validate:"required"`
}

func (deps Deps) handleCreate(w http.ResponseWriter, r *http.Request) {
	authorID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body createPostRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Post.Execute(r.Context(), authorID, body.Title, body.Body)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusCreated, out)
}

type createReplyRequest struct {
	Body string `json:"body" validate:"required"`
}

func (deps Deps) handleReply(w http.ResponseWriter, r *http.Request) {
	authorID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	postID, err := httpinterface.PathUUID(r, "postId", "BoardPost")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body createReplyRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Reply.Execute(r.Context(), postID, authorID, body.Body)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusCreated, out)
}
