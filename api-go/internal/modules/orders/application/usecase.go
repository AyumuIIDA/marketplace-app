package ordersapp

import (
	"context"

	"github.com/google/uuid"

	ordersdomain "marketplace/api-go/internal/modules/orders/domain"
	"marketplace/api-go/internal/shared/clock"
)

// --- GetOrder ---

type GetOrderUseCase struct {
	repo ordersdomain.OrderRepository
	svc  *OrderFulfillmentService
}

func NewGetOrderUseCase(repo ordersdomain.OrderRepository, svc *OrderFulfillmentService) *GetOrderUseCase {
	return &GetOrderUseCase{repo: repo, svc: svc}
}

func (uc *GetOrderUseCase) Execute(ctx context.Context, orderID, participantID uuid.UUID) (OrderView, error) {
	order, err := uc.svc.GetOrderForParticipant(ctx, uc.repo, orderID, participantID)
	if err != nil {
		return OrderView{}, err
	}
	return PresentOrder(order), nil
}

// --- ListOrders ---

type ListOrdersInput struct {
	ParticipantID uuid.UUID
	Status        *ordersdomain.OrderStatus
	Limit         *int32
}

type ListOrdersResult struct {
	Items []OrderView `json:"items"`
}

type ListOrdersUseCase struct {
	repo ordersdomain.OrderRepository
}

func NewListOrdersUseCase(repo ordersdomain.OrderRepository) *ListOrdersUseCase {
	return &ListOrdersUseCase{repo: repo}
}

func (uc *ListOrdersUseCase) Execute(ctx context.Context, in ListOrdersInput) (ListOrdersResult, error) {
	pid := in.ParticipantID
	orders, err := uc.repo.Search(ctx, ordersdomain.SearchInput{
		ParticipantID: &pid,
		Status:        in.Status,
		Limit:         in.Limit,
	})
	if err != nil {
		return ListOrdersResult{}, err
	}
	items := make([]OrderView, 0, len(orders))
	for _, o := range orders {
		items = append(items, PresentOrder(o))
	}
	return ListOrdersResult{Items: items}, nil
}

// --- MarkOrderShipped ---

type MarkOrderShippedUseCase struct {
	repo  ordersdomain.OrderRepository
	svc   *OrderFulfillmentService
	clock clock.Clock
}

func NewMarkOrderShippedUseCase(repo ordersdomain.OrderRepository, svc *OrderFulfillmentService, c clock.Clock) *MarkOrderShippedUseCase {
	return &MarkOrderShippedUseCase{repo: repo, svc: svc, clock: c}
}

func (uc *MarkOrderShippedUseCase) Execute(ctx context.Context, orderID, sellerID uuid.UUID) (OrderView, error) {
	order, err := uc.svc.GetOrderForParticipant(ctx, uc.repo, orderID, sellerID)
	if err != nil {
		return OrderView{}, err
	}
	if err := order.MarkShipped(sellerID, uc.clock.Now()); err != nil {
		return OrderView{}, err
	}
	if err := uc.repo.Save(ctx, order); err != nil {
		return OrderView{}, err
	}
	return PresentOrder(order), nil
}

// --- MarkOrderReceived ---

type MarkOrderReceivedUseCase struct {
	repo  ordersdomain.OrderRepository
	svc   *OrderFulfillmentService
	clock clock.Clock
}

func NewMarkOrderReceivedUseCase(repo ordersdomain.OrderRepository, svc *OrderFulfillmentService, c clock.Clock) *MarkOrderReceivedUseCase {
	return &MarkOrderReceivedUseCase{repo: repo, svc: svc, clock: c}
}

func (uc *MarkOrderReceivedUseCase) Execute(ctx context.Context, orderID, buyerID uuid.UUID) (OrderView, error) {
	order, err := uc.svc.GetOrderForParticipant(ctx, uc.repo, orderID, buyerID)
	if err != nil {
		return OrderView{}, err
	}
	if err := order.MarkReceived(buyerID, uc.clock.Now()); err != nil {
		return OrderView{}, err
	}
	if err := uc.repo.Save(ctx, order); err != nil {
		return OrderView{}, err
	}
	return PresentOrder(order), nil
}
