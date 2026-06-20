package mcpinterface

import (
	"marketplace/api-go/internal/app/workflows"
	aiapp "marketplace/api-go/internal/modules/aiassistance/application"
	identityapp "marketplace/api-go/internal/modules/identity/application"
	listingsapp "marketplace/api-go/internal/modules/listings/application"
	ordersapp "marketplace/api-go/internal/modules/orders/application"
)

// ToolDeps はMCP tool群が必要とするUseCase/Workflowの束（Composition Rootが充填）。
type ToolDeps struct {
	GetCurrentUser       *identityapp.GetCurrentUserUseCase
	SearchListings       *listingsapp.SearchListingsUseCase
	GetListing           *listingsapp.GetListingUseCase
	CreateListing        *listingsapp.CreateListingUseCase
	PublishListing       *listingsapp.PublishListingUseCase
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
	// ImageFetcher は get_listing のヒーロー画像インライン化用（任意。未注入なら ResourceLink へ劣化）。
	ImageFetcher ImageFetcher
	// 意味検索(RAG)。VectorHealth が未注入/不可用なら各ツールは「keyword検索を使え」と縮退案内する。
	SearchSemantic *workflows.SemanticSearchWorkflow
	FindSimilar    *workflows.SimilarListingsWorkflow
	VectorHealth   VectorHealth
}

// BuildTools は全MCPツールを構築する。
func BuildTools(d ToolDeps) []McpTool {
	return []McpTool{
		getCurrentUserTool{d.GetCurrentUser},
		searchListingsTool{d.SearchListings},
		getListingTool{d.GetListing, d.ImageFetcher},
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
		searchListingsSemanticTool{d.SearchSemantic, d.VectorHealth},
		findSimilarListingsTool{d.FindSimilar, d.VectorHealth},
		presentDiscoverOutputTool{},
	}
}
