package mcpinterface

import (
	"context"

	"github.com/outarc/marketplace/api-go/internal/app/workflows"
	aiapp "github.com/outarc/marketplace/api-go/internal/modules/aiassistance/application"
	identityapp "github.com/outarc/marketplace/api-go/internal/modules/identity/application"
)

// get_current_user
type getCurrentUserTool struct {
	uc *identityapp.GetCurrentUserUseCase
}

func (getCurrentUserTool) Name() string { return "get_current_user" }
func (t getCurrentUserTool) Execute(ctx context.Context, _ map[string]any, tc ToolContext) (ToolResult, error) {
	userID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	out, err := t.uc.Execute(ctx, userID)
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// suggest_listing_fields
type suggestListingFieldsTool struct {
	uc *aiapp.SuggestListingFieldsUseCase
}

func (suggestListingFieldsTool) Name() string { return "suggest_listing_fields" }
func (t suggestListingFieldsTool) Execute(ctx context.Context, in map[string]any, _ ToolContext) (ToolResult, error) {
	out, err := t.uc.Execute(ctx, aiapp.SuggestListingFieldsInput{
		UserHint:  argStr(in, "userHint"),
		ImageURLs: argStrSlice(in, "imageUrls"),
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// suggest_price
type suggestPriceTool struct{ assistant aiapp.AiAssistant }

func (suggestPriceTool) Name() string { return "suggest_price" }
func (t suggestPriceTool) Execute(ctx context.Context, in map[string]any, _ ToolContext) (ToolResult, error) {
	out, err := t.assistant.SuggestPrice(ctx, aiapp.SuggestPriceInput{
		Title:         argStrRaw(in, "title"),
		Category:      argStrRaw(in, "category"),
		Condition:     argStrRaw(in, "condition"),
		PriceStrategy: argStr(in, "priceStrategy"),
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// suggest_message
type suggestMessageTool struct{ assistant aiapp.AiAssistant }

func (suggestMessageTool) Name() string { return "suggest_message" }
func (t suggestMessageTool) Execute(ctx context.Context, in map[string]any, _ ToolContext) (ToolResult, error) {
	out, err := t.assistant.SuggestMessage(ctx, aiapp.SuggestMessageInput{
		OrderID: argStrRaw(in, "orderId"),
		Intent:  argStr(in, "intent"),
		Tone:    argStr(in, "tone"),
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// suggest_review
type suggestReviewTool struct{ assistant aiapp.AiAssistant }

func (suggestReviewTool) Name() string { return "suggest_review" }
func (t suggestReviewTool) Execute(ctx context.Context, in map[string]any, _ ToolContext) (ToolResult, error) {
	out, err := t.assistant.SuggestReview(ctx, aiapp.SuggestReviewInput{
		OrderID:    argStrRaw(in, "orderId"),
		RatingHint: argInt32(in, "ratingHint"),
		Tone:       argStr(in, "tone"),
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// compare_listings
type compareListingsTool struct {
	wf *workflows.CompareListingsWorkflow
}

func (compareListingsTool) Name() string { return "compare_listings" }
func (t compareListingsTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	ids, err := argUUIDSlice(in, "listingIds", "Listing")
	if err != nil {
		return ToolResult{}, err
	}
	requesterID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	out, err := t.wf.Execute(ctx, ids, requesterID)
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}
