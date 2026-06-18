package mcpinterface

import (
	"context"

	"github.com/google/uuid"

	"marketplace/api-go/internal/app/workflows"
	listingsapp "marketplace/api-go/internal/modules/listings/application"
	listingsdomain "marketplace/api-go/internal/modules/listings/domain"
)

// search_listings
type searchListingsTool struct {
	uc *listingsapp.SearchListingsUseCase
}

func (searchListingsTool) Name() string { return "search_listings" }
func (t searchListingsTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	mine := argBool(in, "mine")
	input := listingsapp.SearchListingsInput{
		Keyword:                argStr(in, "keyword"),
		Category:               argStr(in, "category"),
		Condition:              argStr(in, "condition"),
		MinPrice:               argInt32(in, "minPrice"),
		MaxPrice:               argInt32(in, "maxPrice"),
		Limit:                  argInt32(in, "limit"),
		IncludeDraftsForSeller: mine,
	}
	if mine {
		uid, err := requireUserID(tc)
		if err != nil {
			return ToolResult{}, err
		}
		input.SellerID = &uid
	}
	out, err := t.uc.Execute(ctx, input)
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// get_listing
type getListingTool struct {
	uc *listingsapp.GetListingUseCase
}

func (getListingTool) Name() string { return "get_listing" }
func (t getListingTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	id, err := argUUIDReq(in, "listingId", "Listing")
	if err != nil {
		return ToolResult{}, err
	}
	var rid *uuid.UUID
	if uid, uerr := requireUserID(tc); uerr == nil {
		rid = &uid
	}
	out, err := t.uc.Execute(ctx, id, rid)
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// create_listing_draft
type createListingDraftTool struct {
	uc *listingsapp.CreateListingUseCase
}

func (createListingDraftTool) Name() string { return "create_listing_draft" }
func (t createListingDraftTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	sellerID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	agentID, err := agentUUID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	price := int32(0)
	if p := argInt32(in, "price"); p != nil {
		price = *p
	}
	out, err := t.uc.Execute(ctx, listingsapp.CreateListingInput{
		SellerID: sellerID,
		AgentID:  agentID,
		Fields: listingsdomain.ListingFields{
			Title:       argStrRaw(in, "title"),
			Description: argStrRaw(in, "description"),
			Price:       price,
			Currency:    listingsdomain.CurrencyJPY,
			Category:    argStrRaw(in, "category"),
			Condition:   argStrRaw(in, "condition"),
		},
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// publish_listing
type publishListingTool struct {
	wf *workflows.PublishListingWithHumanSignatureWorkflow
}

func (publishListingTool) Name() string { return "publish_listing" }
func (t publishListingTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	listingID, err := argUUIDReq(in, "listingId", "Listing")
	if err != nil {
		return ToolResult{}, err
	}
	idKit, ok := toIdKit(in)
	if !ok {
		return RequiresHumanSignature(map[string]any{"actionType": "listing-publish", "resourceType": "LISTING", "resourceId": listingID.String()}), nil
	}
	sellerID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	out, err := t.wf.Execute(ctx, workflows.PublishListingInput{
		ListingID:           listingID,
		SellerID:            sellerID,
		IdKit:               idKit,
		ExpectedEnvironment: argStr(in, "expectedEnvironment"),
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// update_listing
type updateListingTool struct {
	wf *workflows.UpdateListingWithHumanSignatureWorkflow
}

func (updateListingTool) Name() string { return "update_listing" }
func (t updateListingTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	listingID, err := argUUIDReq(in, "listingId", "Listing")
	if err != nil {
		return ToolResult{}, err
	}
	idKit, ok := toIdKit(in)
	if !ok {
		return RequiresHumanSignature(map[string]any{"actionType": "listing-update", "resourceType": "LISTING", "resourceId": listingID.String()}), nil
	}
	sellerID, err := requireUserID(tc)
	if err != nil {
		return ToolResult{}, err
	}
	fields, ok := in["fields"].(map[string]any)
	if !ok {
		fields = map[string]any{}
	}
	price := int32(0)
	if p := argInt32(fields, "price"); p != nil {
		price = *p
	}
	out, err := t.wf.Execute(ctx, workflows.UpdateListingInput{
		ListingID: listingID,
		SellerID:  sellerID,
		Fields: listingsdomain.ListingFields{
			Title:       argStrRaw(fields, "title"),
			Description: argStrRaw(fields, "description"),
			Price:       price,
			Currency:    listingsdomain.CurrencyJPY,
			Category:    argStrRaw(fields, "category"),
			Condition:   argStrRaw(fields, "condition"),
		},
		IdKit:               idKit,
		ExpectedEnvironment: argStr(in, "expectedEnvironment"),
	})
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}
