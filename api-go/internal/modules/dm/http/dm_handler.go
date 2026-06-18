// Package dmhttp はユーザー間DMのHTTP adapter（/conversations 系）。
package dmhttp

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	httpinterface "marketplace/api-go/internal/interface/http"
	dmapp "marketplace/api-go/internal/modules/dm/application"
)

// Deps はDM HTTPの依存。
type Deps struct {
	Send     *dmapp.SendDirectMessageService
	Thread   *dmapp.ListThreadUseCase
	Inbox    *dmapp.ListInboxUseCase
	MarkRead *dmapp.MarkThreadReadUseCase
}

// RegisterRoutes はDMルートを認証済みグループへ登録する（ログインユーザーに公開）。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Get("/conversations", deps.handleInbox)
	r.Get("/conversations/{userId}", deps.handleThread)
	r.Post("/conversations/{userId}", deps.handleSend)
	r.Post("/conversations/{userId}/read", deps.handleMarkRead)
}

const threadLimit = 200

func (deps Deps) handleInbox(w http.ResponseWriter, r *http.Request) {
	me, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Inbox.Execute(r.Context(), me)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func (deps Deps) handleThread(w http.ResponseWriter, r *http.Request) {
	me, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	peer, err := httpinterface.PathUUID(r, "userId", "User")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Thread.Execute(r.Context(), me, peer, threadLimit)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

type sendRequest struct {
	Body string `json:"body" validate:"required"`
}

func (deps Deps) handleSend(w http.ResponseWriter, r *http.Request) {
	me, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	peer, err := httpinterface.PathUUID(r, "userId", "User")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body sendRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Send.Execute(r.Context(), dmapp.SendDirectMessageInput{
		SenderID:    me,
		RecipientID: peer,
		Body:        body.Body,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusCreated, out)
}

func (deps Deps) handleMarkRead(w http.ResponseWriter, r *http.Request) {
	me, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	peer, err := httpinterface.PathUUID(r, "userId", "User")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	if err := deps.MarkRead.Execute(r.Context(), me, peer); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
