package mcpinterface

import (
	"context"

	"marketplace/api-go/internal/app/workflows"
	ordersapp "marketplace/api-go/internal/modules/orders/application"
	ordersdomain "marketplace/api-go/internal/modules/orders/domain"
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
		// エージェントがチャット内で自己完結できるよう、確認手順を明示する。
		// 画面UIは存在せず、確認＝同じ listingId に confirmed=true を付けて再呼び出しすること。
		return RequiresConfirmation(map[string]any{
			"status":               out.Status,
			"listingId":            listingID.String(),
			"confirmationRequired": true,
			"nextStep":             `To complete the purchase, call purchase_item again with {"listingId":"` + listingID.String() + `","confirmed":true}. There is no on-screen button; confirmation happens by re-calling this tool with confirmed=true.`,
			"details":              out,
		}), nil
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
