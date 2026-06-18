package mcpinterface

import (
	"context"

	"github.com/outarc/marketplace/api-go/internal/app/workflows"
)

// send_message
type sendMessageTool struct {
	wf *workflows.SendOrderMessageWorkflow
}

func (sendMessageTool) Name() string { return "send_message" }
func (t sendMessageTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	orderID, err := argUUIDReq(in, "orderId", "Order")
	if err != nil {
		return ToolResult{}, err
	}
	senderID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	agentID, err := agentUUID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	out, err := t.wf.Execute(ctx, workflows.SendOrderMessageInput{
		OrderID:  orderID,
		SenderID: senderID,
		Body:     argStrRaw(in, "body"),
		AgentID:  agentID,
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// list_messages
type listMessagesTool struct {
	wf *workflows.ListOrderMessagesWorkflow
}

func (listMessagesTool) Name() string { return "list_messages" }
func (t listMessagesTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	orderID, err := argUUIDReq(in, "orderId", "Order")
	if err != nil {
		return ToolResult{}, err
	}
	participantID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	out, err := t.wf.Execute(ctx, workflows.ListOrderMessagesInput{
		OrderID:       orderID,
		ParticipantID: participantID,
		Limit:         argInt32(in, "limit"),
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// create_review
type createReviewTool struct {
	wf *workflows.CreateReviewWorkflow
}

func (createReviewTool) Name() string { return "create_review" }
func (t createReviewTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	orderID, err := argUUIDReq(in, "orderId", "Order")
	if err != nil {
		return ToolResult{}, err
	}
	reviewerID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	agentID, err := agentUUID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	rating := int32(0)
	if p := argInt32(in, "rating"); p != nil {
		rating = *p
	}
	out, err := t.wf.Execute(ctx, workflows.CreateReviewInput{
		OrderID:    orderID,
		ReviewerID: reviewerID,
		Rating:     rating,
		Comment:    argStrRaw(in, "comment"),
		AgentID:    agentID,
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// submit_review
type submitReviewTool struct {
	wf *workflows.SubmitReviewWithHumanSignatureWorkflow
}

func (submitReviewTool) Name() string { return "submit_review" }
func (t submitReviewTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	reviewID, err := argUUIDReq(in, "reviewId", "Review")
	if err != nil {
		return ToolResult{}, err
	}
	idKit, ok := toIdKit(in)
	if !ok {
		return RequiresHumanSignature(map[string]any{"actionType": "review-submit", "resourceType": "REVIEW", "resourceId": reviewID.String()}), nil
	}
	reviewerID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	out, err := t.wf.Execute(ctx, workflows.SubmitReviewInput{
		ReviewID:            reviewID,
		ReviewerID:          reviewerID,
		IdKit:               idKit,
		ExpectedEnvironment: argStr(in, "expectedEnvironment"),
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}
