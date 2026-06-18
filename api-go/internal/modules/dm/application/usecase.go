// Package dmapp はユーザー間DMのUseCaseを実装する。
package dmapp

import (
	"context"

	"github.com/google/uuid"

	dmdomain "marketplace/api-go/internal/modules/dm/domain"
	"marketplace/api-go/internal/shared/clock"
	"marketplace/api-go/internal/shared/ids"
)

// DirectMessageView はDMの応答表現（camelCase）。
type DirectMessageView struct {
	MessageID   string  `json:"messageId"`
	SenderID    string  `json:"senderId"`
	RecipientID string  `json:"recipientId"`
	Body        string  `json:"body"`
	ReadAt      *string `json:"readAt"`
	CreatedAt   string  `json:"createdAt"`
}

func presentMessage(m *dmdomain.DirectMessage) DirectMessageView {
	var readAt *string
	if m.ReadAt() != nil {
		s := m.ReadAt().Format(timeLayout)
		readAt = &s
	}
	return DirectMessageView{
		MessageID:   m.ID().String(),
		SenderID:    m.SenderID().String(),
		RecipientID: m.RecipientID().String(),
		Body:        m.Body(),
		ReadAt:      readAt,
		CreatedAt:   m.CreatedAt().Format(timeLayout),
	}
}

const timeLayout = "2006-01-02T15:04:05.000000Z07:00"

// --- SendDirectMessage ---

type SendDirectMessageInput struct {
	SenderID    uuid.UUID
	RecipientID uuid.UUID
	Body        string
}

type SendDirectMessageService struct {
	repo  dmdomain.Repository
	idGen ids.Generator
	clock clock.Clock
}

func NewSendDirectMessageService(repo dmdomain.Repository, g ids.Generator, c clock.Clock) *SendDirectMessageService {
	return &SendDirectMessageService{repo: repo, idGen: g, clock: c}
}

func (s *SendDirectMessageService) Execute(ctx context.Context, in SendDirectMessageInput) (DirectMessageView, error) {
	message, err := dmdomain.NewDirectMessage(s.idGen.NewID(), in.SenderID, in.RecipientID, in.Body, s.clock.Now())
	if err != nil {
		return DirectMessageView{}, err
	}
	if err := s.repo.Save(ctx, message); err != nil {
		return DirectMessageView{}, err
	}
	return presentMessage(message), nil
}

// --- ListThread ---

type ListThreadResult struct {
	Items []DirectMessageView `json:"items"`
}

type ListThreadUseCase struct {
	repo dmdomain.Repository
}

func NewListThreadUseCase(repo dmdomain.Repository) *ListThreadUseCase {
	return &ListThreadUseCase{repo: repo}
}

func (uc *ListThreadUseCase) Execute(ctx context.Context, me, peer uuid.UUID, limit int32) (ListThreadResult, error) {
	messages, err := uc.repo.ListThread(ctx, me, peer, limit)
	if err != nil {
		return ListThreadResult{}, err
	}
	items := make([]DirectMessageView, 0, len(messages))
	for _, m := range messages {
		items = append(items, presentMessage(m))
	}
	return ListThreadResult{Items: items}, nil
}

// --- ListInbox ---

type InboxItemView struct {
	PeerID       string `json:"peerId"`
	Body         string `json:"body"`
	LastSenderID string `json:"lastSenderId"`
	CreatedAt    string `json:"createdAt"`
	Unread       int64  `json:"unread"`
}

type InboxResult struct {
	Items []InboxItemView `json:"items"`
}

type ListInboxUseCase struct {
	repo dmdomain.Repository
}

func NewListInboxUseCase(repo dmdomain.Repository) *ListInboxUseCase {
	return &ListInboxUseCase{repo: repo}
}

func (uc *ListInboxUseCase) Execute(ctx context.Context, me uuid.UUID) (InboxResult, error) {
	items, err := uc.repo.ListInbox(ctx, me)
	if err != nil {
		return InboxResult{}, err
	}
	views := make([]InboxItemView, 0, len(items))
	for _, it := range items {
		views = append(views, InboxItemView{
			PeerID:       it.PeerID.String(),
			Body:         it.Body,
			LastSenderID: it.LastSenderID.String(),
			CreatedAt:    it.CreatedAt.Format(timeLayout),
			Unread:       it.Unread,
		})
	}
	return InboxResult{Items: views}, nil
}

// --- MarkThreadRead ---

type MarkThreadReadUseCase struct {
	repo  dmdomain.Repository
	clock clock.Clock
}

func NewMarkThreadReadUseCase(repo dmdomain.Repository, c clock.Clock) *MarkThreadReadUseCase {
	return &MarkThreadReadUseCase{repo: repo, clock: c}
}

func (uc *MarkThreadReadUseCase) Execute(ctx context.Context, me, peer uuid.UUID) error {
	return uc.repo.MarkThreadRead(ctx, me, peer, uc.clock.Now())
}
