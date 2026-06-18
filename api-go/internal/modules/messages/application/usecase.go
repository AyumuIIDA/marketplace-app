// Package messagesapp はDMのUseCase/Serviceを実装する。
package messagesapp

import (
	"context"
	"time"

	"github.com/google/uuid"

	messagesdomain "github.com/outarc/marketplace/api-go/internal/modules/messages/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
	"github.com/outarc/marketplace/api-go/internal/shared/clock"
	"github.com/outarc/marketplace/api-go/internal/shared/ids"
)

// MessageView はメッセージの応答表現（既存フロント互換のcamelCase）。
type MessageView struct {
	MessageID   string     `json:"messageId"`
	OrderID     string     `json:"orderId"`
	SenderID    string     `json:"senderId"`
	RecipientID string     `json:"recipientId"`
	AgentID     *string    `json:"agentId,omitempty"`
	Body        string     `json:"body"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
	HiddenAt    *time.Time `json:"hiddenAt,omitempty"`
}

// PresentMessage はEntityを応答DTOへ写す。
func PresentMessage(m *messagesdomain.Message) MessageView {
	var agentID *string
	if m.AgentID() != nil {
		s := m.AgentID().String()
		agentID = &s
	}
	return MessageView{
		MessageID:   m.ID().String(),
		OrderID:     m.OrderID().String(),
		SenderID:    m.SenderID().String(),
		RecipientID: m.RecipientID().String(),
		AgentID:     agentID,
		Body:        m.Body(),
		Status:      string(m.Status()),
		CreatedAt:   m.CreatedAt(),
		HiddenAt:    m.HiddenAt(),
	}
}

// --- SendMessageService（workflowからtx-bound repoを受け取って送信）---

type SendMessageInput struct {
	OrderID     uuid.UUID
	SenderID    uuid.UUID
	RecipientID uuid.UUID
	AgentID     *uuid.UUID
	Body        string
}

type SendMessageService struct {
	ids   ids.Generator
	clock clock.Clock
}

func NewSendMessageService(g ids.Generator, c clock.Clock) *SendMessageService {
	return &SendMessageService{ids: g, clock: c}
}

func (s *SendMessageService) Send(ctx context.Context, repo messagesdomain.MessageRepository, in SendMessageInput) (MessageView, error) {
	message, err := messagesdomain.NewMessage(messagesdomain.CreateMessageInput{
		ID:          s.ids.NewID(),
		OrderID:     in.OrderID,
		SenderID:    in.SenderID,
		RecipientID: in.RecipientID,
		AgentID:     in.AgentID,
		Body:        in.Body,
		Now:         s.clock.Now(),
	})
	if err != nil {
		return MessageView{}, err
	}
	if err := repo.Save(ctx, message); err != nil {
		return MessageView{}, err
	}
	return PresentMessage(message), nil
}

// --- ListMessagesService（workflowからtx-bound repoを受け取って一覧）---

type ListMessagesInput struct {
	OrderID       *uuid.UUID
	ParticipantID *uuid.UUID
	Status        *messagesdomain.MessageStatus
	Limit         *int32
}

type ListMessagesResult struct {
	Items []MessageView `json:"items"`
}

type ListMessagesService struct{}

func NewListMessagesService() ListMessagesService { return ListMessagesService{} }

func (ListMessagesService) List(ctx context.Context, repo messagesdomain.MessageRepository, in ListMessagesInput) (ListMessagesResult, error) {
	messages, err := repo.Search(ctx, messagesdomain.SearchInput{
		OrderID:       in.OrderID,
		ParticipantID: in.ParticipantID,
		Status:        in.Status,
		Limit:         in.Limit,
	})
	if err != nil {
		return ListMessagesResult{}, err
	}
	items := make([]MessageView, 0, len(messages))
	for _, m := range messages {
		items = append(items, PresentMessage(m))
	}
	return ListMessagesResult{Items: items}, nil
}

// --- HideMessage（単一module・pool repo）---

type HideMessageUseCase struct {
	repo  messagesdomain.MessageRepository
	clock clock.Clock
}

func NewHideMessageUseCase(repo messagesdomain.MessageRepository, c clock.Clock) *HideMessageUseCase {
	return &HideMessageUseCase{repo: repo, clock: c}
}

func (uc *HideMessageUseCase) Execute(ctx context.Context, messageID, actorID uuid.UUID) (MessageView, error) {
	message, err := uc.repo.FindByID(ctx, messageID)
	if err != nil {
		return MessageView{}, err
	}
	if message == nil {
		return MessageView{}, apperr.NotFound("Message", messageID.String())
	}
	if err := message.Hide(actorID, uc.clock.Now()); err != nil {
		return MessageView{}, err
	}
	if err := uc.repo.Save(ctx, message); err != nil {
		return MessageView{}, err
	}
	return PresentMessage(message), nil
}
