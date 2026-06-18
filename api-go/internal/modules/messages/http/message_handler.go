// Package messageshttp はDMのHTTP adapter（/orders/{id}/messages, /messages 系）。
package messageshttp

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"marketplace/api-go/internal/app/workflows"
	httpinterface "marketplace/api-go/internal/interface/http"
	messagesapp "marketplace/api-go/internal/modules/messages/application"
	messagesdomain "marketplace/api-go/internal/modules/messages/domain"
	"marketplace/api-go/internal/shared/apperr"
)

// Deps はDM HTTPの依存。send/list は跨moduleworkflow、hide は単一moduleUseCase。
type Deps struct {
	Send *workflows.SendOrderMessageWorkflow
	List *workflows.ListOrderMessagesWorkflow
	Hide *messagesapp.HideMessageUseCase
}

// RegisterRoutes は注文スコープDMとhideを認証済みグループへ登録する。
// /orders/{orderId}/messages は orders module と prefix を共有するため直接登録する。
func RegisterRoutes(r chi.Router, deps Deps) {
	r.Get("/orders/{orderId}/messages", deps.handleList)
	r.Post("/orders/{orderId}/messages", deps.handleSend)
	r.Post("/messages/{messageId}/hide", deps.handleHide)
}

func (deps Deps) handleList(w http.ResponseWriter, r *http.Request) {
	participantID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	orderID, err := httpinterface.PathUUID(r, "orderId", "Order")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	status, err := optionalMessageStatus(r.URL.Query().Get("status"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	limit, err := httpinterface.OptionalLimit(r.URL.Query().Get("limit"))
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.List.Execute(r.Context(), workflows.ListOrderMessagesInput{
		OrderID:       orderID,
		ParticipantID: participantID,
		Status:        status,
		Limit:         limit,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

type sendMessageRequest struct {
	Body    string  `json:"body" validate:"required,max=5000"`
	AgentID *string `json:"agentId"`
}

func (deps Deps) handleSend(w http.ResponseWriter, r *http.Request) {
	senderID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	orderID, err := httpinterface.PathUUID(r, "orderId", "Order")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	var body sendMessageRequest
	if err := httpinterface.DecodeJSON(r, &body); err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	agentID, err := parseOptionalUUID(body.AgentID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Send.Execute(r.Context(), workflows.SendOrderMessageInput{
		OrderID:  orderID,
		SenderID: senderID,
		Body:     body.Body,
		AgentID:  agentID,
	})
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusCreated, out)
}

func (deps Deps) handleHide(w http.ResponseWriter, r *http.Request) {
	actorID, err := httpinterface.CurrentUserID(r)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	messageID, err := httpinterface.PathUUID(r, "messageId", "Message")
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	out, err := deps.Hide.Execute(r.Context(), messageID, actorID)
	if err != nil {
		httpinterface.WriteError(w, r, err)
		return
	}
	httpinterface.WriteJSON(w, http.StatusOK, out)
}

func optionalMessageStatus(s string) (*messagesdomain.MessageStatus, error) {
	if s == "" {
		return nil, nil
	}
	switch messagesdomain.MessageStatus(s) {
	case messagesdomain.MessageStatusSent, messagesdomain.MessageStatusHidden:
		st := messagesdomain.MessageStatus(s)
		return &st, nil
	default:
		return nil, apperr.Validation("status is invalid.",
			apperr.FieldError{Field: "status", Reason: "enum"})
	}
}

func parseOptionalUUID(s *string) (*uuid.UUID, error) {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil, nil
	}
	id, err := uuid.Parse(strings.TrimSpace(*s))
	if err != nil {
		return nil, apperr.Validation("agentId must be a valid id.",
			apperr.FieldError{Field: "agentId", Reason: "invalid"})
	}
	return &id, nil
}
