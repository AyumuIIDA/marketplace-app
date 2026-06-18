// Package dmdomain はユーザー間DM（注文に紐づかない）のdomainモデルとrepository portを定義する。
package dmdomain

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"marketplace/api-go/internal/shared/apperr"
)

const maxBodyLen = 5000

// DirectMessage はユーザー対ユーザーのDM Entity。
type DirectMessage struct {
	id          uuid.UUID
	senderID    uuid.UUID
	recipientID uuid.UUID
	body        string
	readAt      *time.Time
	createdAt   time.Time
}

// NewDirectMessage は不変条件（送受信者が別・本文長）を検証して生成する。
func NewDirectMessage(id, senderID, recipientID uuid.UUID, body string, now time.Time) (*DirectMessage, error) {
	if senderID == recipientID {
		return nil, apperr.Domain("DM_SENDER_RECIPIENT_SAME", "Sender and recipient must be different.")
	}
	trimmed := strings.TrimSpace(body)
	if trimmed == "" {
		return nil, apperr.Validation("Message body is required.", apperr.FieldError{Field: "body", Reason: "required"})
	}
	if len([]rune(trimmed)) > maxBodyLen {
		return nil, apperr.Validation("Message body is too long.", apperr.FieldError{Field: "body", Reason: "too_long"})
	}
	return &DirectMessage{id: id, senderID: senderID, recipientID: recipientID, body: trimmed, createdAt: now}, nil
}

// RehydrateInput は永続層からのEntity復元入力。
type RehydrateInput struct {
	ID          uuid.UUID
	SenderID    uuid.UUID
	RecipientID uuid.UUID
	Body        string
	ReadAt      *time.Time
	CreatedAt   time.Time
}

func Rehydrate(in RehydrateInput) *DirectMessage {
	return &DirectMessage{
		id:          in.ID,
		senderID:    in.SenderID,
		recipientID: in.RecipientID,
		body:        in.Body,
		readAt:      in.ReadAt,
		createdAt:   in.CreatedAt,
	}
}

func (m *DirectMessage) ID() uuid.UUID          { return m.id }
func (m *DirectMessage) SenderID() uuid.UUID    { return m.senderID }
func (m *DirectMessage) RecipientID() uuid.UUID { return m.recipientID }
func (m *DirectMessage) Body() string           { return m.body }
func (m *DirectMessage) ReadAt() *time.Time     { return m.readAt }
func (m *DirectMessage) CreatedAt() time.Time   { return m.createdAt }

// InboxItem は受信箱の1行（相手ごとの最新メッセージ＋未読数）。
type InboxItem struct {
	PeerID       uuid.UUID
	Body         string
	LastSenderID uuid.UUID
	CreatedAt    time.Time
	Unread       int64
}

// Repository はDMの永続化port。
type Repository interface {
	Save(ctx context.Context, message *DirectMessage) error
	ListThread(ctx context.Context, userA, userB uuid.UUID, limit int32) ([]*DirectMessage, error)
	ListInbox(ctx context.Context, me uuid.UUID) ([]InboxItem, error)
	MarkThreadRead(ctx context.Context, me, peer uuid.UUID, now time.Time) error
}
