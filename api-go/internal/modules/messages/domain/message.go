// Package messagesdomain はDM(message)のdomainモデルとrepository portを定義する。
package messagesdomain

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// MessageStatus はメッセージの状態。
type MessageStatus string

const (
	MessageStatusSent   MessageStatus = "SENT"
	MessageStatusHidden MessageStatus = "HIDDEN"
)

const maxBodyLen = 5000

// Message は注文単位DMのEntity。
type Message struct {
	id          uuid.UUID
	orderID     uuid.UUID
	senderID    uuid.UUID
	recipientID uuid.UUID
	agentID     *uuid.UUID
	body        string
	status      MessageStatus
	createdAt   time.Time
	hiddenAt    *time.Time
}

type CreateMessageInput struct {
	ID          uuid.UUID
	OrderID     uuid.UUID
	SenderID    uuid.UUID
	RecipientID uuid.UUID
	AgentID     *uuid.UUID
	Body        string
	Now         time.Time
}

// NewMessage は不変条件を検証して送信済み(status=SENT)メッセージを生成する。
func NewMessage(in CreateMessageInput) (*Message, error) {
	if in.SenderID == in.RecipientID {
		return nil, apperr.Domain("MESSAGE_SENDER_RECIPIENT_SAME", "Sender and recipient must be different.")
	}
	if err := validateBody(in.Body); err != nil {
		return nil, err
	}
	return &Message{
		id:          in.ID,
		orderID:     in.OrderID,
		senderID:    in.SenderID,
		recipientID: in.RecipientID,
		agentID:     in.AgentID,
		body:        in.Body,
		status:      MessageStatusSent,
		createdAt:   in.Now,
	}, nil
}

type RehydrateInput struct {
	ID          uuid.UUID
	OrderID     uuid.UUID
	SenderID    uuid.UUID
	RecipientID uuid.UUID
	AgentID     *uuid.UUID
	Body        string
	Status      MessageStatus
	CreatedAt   time.Time
	HiddenAt    *time.Time
}

func Rehydrate(in RehydrateInput) *Message {
	return &Message{
		id:          in.ID,
		orderID:     in.OrderID,
		senderID:    in.SenderID,
		recipientID: in.RecipientID,
		agentID:     in.AgentID,
		body:        in.Body,
		status:      in.Status,
		createdAt:   in.CreatedAt,
		hiddenAt:    in.HiddenAt,
	}
}

func (m *Message) ID() uuid.UUID          { return m.id }
func (m *Message) OrderID() uuid.UUID     { return m.orderID }
func (m *Message) SenderID() uuid.UUID    { return m.senderID }
func (m *Message) RecipientID() uuid.UUID { return m.recipientID }
func (m *Message) AgentID() *uuid.UUID    { return m.agentID }
func (m *Message) Body() string           { return m.body }
func (m *Message) Status() MessageStatus  { return m.status }
func (m *Message) CreatedAt() time.Time   { return m.createdAt }
func (m *Message) HiddenAt() *time.Time   { return m.hiddenAt }

// Hide は参加者(送信者/受信者)のみが非表示にできる。
func (m *Message) Hide(actorID uuid.UUID, now time.Time) error {
	if actorID != m.senderID && actorID != m.recipientID {
		return apperr.Domain("MESSAGE_HIDE_ACTOR_INVALID", "Only message participants can hide a message.")
	}
	m.status = MessageStatusHidden
	m.hiddenAt = &now
	return nil
}

func validateBody(body string) error {
	if strings.TrimSpace(body) == "" {
		return apperr.Domain("MESSAGE_BODY_REQUIRED", "Message body is required.",
			apperr.FieldError{Field: "body", Reason: "required"})
	}
	if len(body) > maxBodyLen {
		return apperr.Domain("MESSAGE_BODY_TOO_LONG", "Message body must be 5000 characters or fewer.",
			apperr.FieldError{Field: "body", Reason: "too_long"})
	}
	return nil
}

// SearchInput はメッセージの有界検索条件。participantは sender/recipient いずれか一致。
type SearchInput struct {
	OrderID       *uuid.UUID
	ParticipantID *uuid.UUID
	SenderID      *uuid.UUID
	RecipientID   *uuid.UUID
	Status        *MessageStatus
	Limit         *int32
}

// MessageRepository はメッセージの永続化port。見つからない場合は (nil, nil)。
type MessageRepository interface {
	Save(ctx context.Context, message *Message) error
	FindByID(ctx context.Context, id uuid.UUID) (*Message, error)
	Search(ctx context.Context, in SearchInput) ([]*Message, error)
}
