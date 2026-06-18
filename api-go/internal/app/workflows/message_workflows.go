package workflows

import (
	"context"

	"github.com/google/uuid"

	messagesapp "marketplace/api-go/internal/modules/messages/application"
	messagesdomain "marketplace/api-go/internal/modules/messages/domain"
	ordersapp "marketplace/api-go/internal/modules/orders/application"
	ordersdomain "marketplace/api-go/internal/modules/orders/domain"
)

// MessageRepos は注文DM transaction内で使うtx-bound repository群。
type MessageRepos struct {
	Orders   ordersdomain.OrderRepository
	Messages messagesdomain.MessageRepository
}

// MessageTxRunner は1 transaction内でtx-bound repoを束ねてfnを実行するport。実体はtxrunnerに置く。
type MessageTxRunner interface {
	Run(ctx context.Context, fn func(ctx context.Context, repos MessageRepos) error) error
}

// --- SendOrderMessage ---

type SendOrderMessageInput struct {
	OrderID  uuid.UUID
	SenderID uuid.UUID
	Body     string
	AgentID  *uuid.UUID
}

type SendOrderMessageWorkflow struct {
	tx               MessageTxRunner
	orderFulfillment *ordersapp.OrderFulfillmentService
	send             *messagesapp.SendMessageService
}

func NewSendOrderMessageWorkflow(tx MessageTxRunner, of *ordersapp.OrderFulfillmentService, send *messagesapp.SendMessageService) *SendOrderMessageWorkflow {
	return &SendOrderMessageWorkflow{tx: tx, orderFulfillment: of, send: send}
}

// Execute は注文参加者であることを検証し、相手宛のメッセージを1 transactionで送る。
func (w *SendOrderMessageWorkflow) Execute(ctx context.Context, in SendOrderMessageInput) (messagesapp.MessageView, error) {
	var out messagesapp.MessageView
	err := w.tx.Run(ctx, func(ctx context.Context, repos MessageRepos) error {
		order, err := w.orderFulfillment.GetOrderForParticipant(ctx, repos.Orders, in.OrderID, in.SenderID)
		if err != nil {
			return err
		}
		recipientID := order.SellerID()
		if in.SenderID == order.SellerID() {
			recipientID = order.BuyerID()
		}
		v, err := w.send.Send(ctx, repos.Messages, messagesapp.SendMessageInput{
			OrderID:     in.OrderID,
			SenderID:    in.SenderID,
			RecipientID: recipientID,
			AgentID:     in.AgentID,
			Body:        in.Body,
		})
		if err != nil {
			return err
		}
		out = v
		return nil
	})
	if err != nil {
		return messagesapp.MessageView{}, err
	}
	return out, nil
}

// --- ListOrderMessages ---

type ListOrderMessagesInput struct {
	OrderID       uuid.UUID
	ParticipantID uuid.UUID
	Status        *messagesdomain.MessageStatus
	Limit         *int32
}

type ListOrderMessagesWorkflow struct {
	tx               MessageTxRunner
	orderFulfillment *ordersapp.OrderFulfillmentService
	list             messagesapp.ListMessagesService
}

func NewListOrderMessagesWorkflow(tx MessageTxRunner, of *ordersapp.OrderFulfillmentService, list messagesapp.ListMessagesService) *ListOrderMessagesWorkflow {
	return &ListOrderMessagesWorkflow{tx: tx, orderFulfillment: of, list: list}
}

// Execute は注文参加者であることを検証し、その注文のメッセージ一覧を返す。
func (w *ListOrderMessagesWorkflow) Execute(ctx context.Context, in ListOrderMessagesInput) (messagesapp.ListMessagesResult, error) {
	var out messagesapp.ListMessagesResult
	err := w.tx.Run(ctx, func(ctx context.Context, repos MessageRepos) error {
		if _, err := w.orderFulfillment.GetOrderForParticipant(ctx, repos.Orders, in.OrderID, in.ParticipantID); err != nil {
			return err
		}
		orderID := in.OrderID
		participantID := in.ParticipantID
		v, err := w.list.List(ctx, repos.Messages, messagesapp.ListMessagesInput{
			OrderID:       &orderID,
			ParticipantID: &participantID,
			Status:        in.Status,
			Limit:         in.Limit,
		})
		if err != nil {
			return err
		}
		out = v
		return nil
	})
	if err != nil {
		return messagesapp.ListMessagesResult{}, err
	}
	return out, nil
}
