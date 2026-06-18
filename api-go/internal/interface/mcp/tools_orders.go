package mcpinterface

import (
	"context"

	"github.com/outarc/marketplace/api-go/internal/app/workflows"
	ordersapp "github.com/outarc/marketplace/api-go/internal/modules/orders/application"
	ordersdomain "github.com/outarc/marketplace/api-go/internal/modules/orders/domain"
)

// purchase_item
type purchaseItemTool struct {
	wf *workflows.PurchaseItemWorkflow
}

func (purchaseItemTool) Name() string { return "purchase_item" }
func (t purchaseItemTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	listingID, err := argUUIDReq(in, "listingId", "Listing")
	if err != nil {
		return ToolResult{}, err
	}
	buyerID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	out, err := t.wf.Execute(ctx, workflows.PurchaseItemInput{
		ListingID: listingID,
		BuyerID:   buyerID,
		Confirmed: argBool(in, "confirmed"),
	})
	if err != nil {
		return ToolResult{}, err
	}
	if out.Status == "REQUIRES_CONFIRMATION" {
		return RequiresConfirmation(out), nil
	}
	return Succeeded(out), nil
}

// list_orders
type listOrdersTool struct{ uc *ordersapp.ListOrdersUseCase }

func (listOrdersTool) Name() string { return "list_orders" }
func (t listOrdersTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	userID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	var status *ordersdomain.OrderStatus
	if s := argStr(in, "status"); s != nil {
		st := ordersdomain.OrderStatus(*s)
		status = &st
	}
	out, err := t.uc.Execute(ctx, ordersapp.ListOrdersInput{ParticipantID: userID, Status: status, Limit: argInt32(in, "limit")})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// mark_shipped
type markShippedTool struct {
	uc *ordersapp.MarkOrderShippedUseCase
}

func (markShippedTool) Name() string { return "mark_shipped" }
func (t markShippedTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	orderID, err := argUUIDReq(in, "orderId", "Order")
	if err != nil {
		return ToolResult{}, err
	}
	sellerID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	out, err := t.uc.Execute(ctx, orderID, sellerID)
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// mark_received
type markReceivedTool struct {
	uc *ordersapp.MarkOrderReceivedUseCase
}

func (markReceivedTool) Name() string { return "mark_received" }
func (t markReceivedTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	orderID, err := argUUIDReq(in, "orderId", "Order")
	if err != nil {
		return ToolResult{}, err
	}
	buyerID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	out, err := t.uc.Execute(ctx, orderID, buyerID)
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}
