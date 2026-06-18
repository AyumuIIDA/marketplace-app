package mcpinterface

import (
	"github.com/outarc/marketplace/api-go/internal/app/workflows"
	aiapp "github.com/outarc/marketplace/api-go/internal/modules/aiassistance/application"
	identityapp "github.com/outarc/marketplace/api-go/internal/modules/identity/application"
	listingsapp "github.com/outarc/marketplace/api-go/internal/modules/listings/application"
	ordersapp "github.com/outarc/marketplace/api-go/internal/modules/orders/application"
)

// ToolDeps はMCP tool群が必要とするUseCase/Workflowの束（Composition Rootが充填）。
type ToolDeps struct {
	GetCurrentUser       *identityapp.GetCurrentUserUseCase
	SearchListings       *listingsapp.SearchListingsUseCase
	GetListing           *listingsapp.GetListingUseCase
	CreateListing        *listingsapp.CreateListingUseCase
	PublishListing       *workflows.PublishListingWithHumanSignatureWorkflow
	UpdateListing        *workflows.UpdateListingWithHumanSignatureWorkflow
	Purchase             *workflows.PurchaseItemWorkflow
	ListOrders           *ordersapp.ListOrdersUseCase
	MarkShipped          *ordersapp.MarkOrderShippedUseCase
	MarkReceived         *ordersapp.MarkOrderReceivedUseCase
	SendMessage          *workflows.SendOrderMessageWorkflow
	ListMessages         *workflows.ListOrderMessagesWorkflow
	CreateReview         *workflows.CreateReviewWorkflow
	SubmitReview         *workflows.SubmitReviewWithHumanSignatureWorkflow
	SuggestListingFields *aiapp.SuggestListingFieldsUseCase
	Assistant            aiapp.AiAssistant
	CompareListings      *workflows.CompareListingsWorkflow
}

// BuildTools は全MCPツールを構築する。
func BuildTools(d ToolDeps) []McpTool {
	return []McpTool{
		getCurrentUserTool{d.GetCurrentUser},
		searchListingsTool{d.SearchListings},
		getListingTool{d.GetListing},
		createListingDraftTool{d.CreateListing},
		publishListingTool{d.PublishListing},
		updateListingTool{d.UpdateListing},
		purchaseItemTool{d.Purchase},
		listOrdersTool{d.ListOrders},
		markShippedTool{d.MarkShipped},
		markReceivedTool{d.MarkReceived},
		sendMessageTool{d.SendMessage},
		listMessagesTool{d.ListMessages},
		createReviewTool{d.CreateReview},
		submitReviewTool{d.SubmitReview},
		suggestListingFieldsTool{d.SuggestListingFields},
		suggestPriceTool{d.Assistant},
		suggestMessageTool{d.Assistant},
		suggestReviewTool{d.Assistant},
		compareListingsTool{d.CompareListings},
	}
}
