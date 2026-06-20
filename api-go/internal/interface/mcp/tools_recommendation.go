package mcpinterface

import (
	"context"

	"github.com/google/uuid"

	"marketplace/api-go/internal/app/workflows"
	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
	"marketplace/api-go/internal/shared/apperr"
)

// VectorHealth は意味検索バックエンドの可用性を返す（recommendation の Healthy を満たす）。
type VectorHealth interface {
	Healthy(ctx context.Context) bool
}

// semanticUnavailable は意味検索が使えない時にエージェントへ返す案内（keyword検索へ誘導）。
func semanticUnavailable() ToolResult {
	return Succeeded(map[string]any{
		"available": false,
		"message":   "Semantic search is currently unavailable. Use the search_listings tool (keyword search) instead.",
	})
}

// search_listings_semantic: 自然文の意味検索（RAG/ベクトル）。keyword と使い分ける。
type searchListingsSemanticTool struct {
	wf     *workflows.SemanticSearchWorkflow
	health VectorHealth
}

func (searchListingsSemanticTool) Name() string { return "search_listings_semantic" }
func (t searchListingsSemanticTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	if t.wf == nil || t.health == nil || !t.health.Healthy(ctx) {
		return semanticUnavailable(), nil
	}
	query := argStrRaw(in, "query")
	if query == "" {
		query = argStrRaw(in, "keyword") // 引数名の揺れに寛容に
	}
	if query == "" {
		return ToolResult{}, apperr.Validation("query is required.",
			apperr.FieldError{Field: "query", Reason: "required"})
	}
	topK := int32(24)
	if v := argInt32(in, "limit"); v != nil {
		topK = *v
	} else if v := argInt32(in, "topK"); v != nil {
		topK = *v
	}
	filter := recommendationapp.SearchFilter{
		Categories: argStrSlice(in, "categories"),
		MinPrice:   argInt32(in, "minPrice"),
		MaxPrice:   argInt32(in, "maxPrice"),
	}
	if cat := argStrRaw(in, "category"); cat != "" && len(filter.Categories) == 0 {
		filter.Categories = []string{cat}
	}
	var rid *uuid.UUID
	if uid, err := requireUserID(tc); err == nil {
		rid = &uid
	}
	out, err := t.wf.Execute(ctx, query, filter, topK, rid)
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}

// find_similar_listings: 指定出品に類似した出品をベクトル近傍で返す。
type findSimilarListingsTool struct {
	wf     *workflows.SimilarListingsWorkflow
	health VectorHealth
}

func (findSimilarListingsTool) Name() string { return "find_similar_listings" }
func (t findSimilarListingsTool) Execute(ctx context.Context, in map[string]any, tc ToolContext) (ToolResult, error) {
	if t.wf == nil || t.health == nil || !t.health.Healthy(ctx) {
		return semanticUnavailable(), nil
	}
	listingID, err := argUUIDReq(in, "listingId", "Listing")
	if err != nil {
		return ToolResult{}, err
	}
	topK := int32(12)
	if v := argInt32(in, "limit"); v != nil {
		topK = *v
	} else if v := argInt32(in, "topK"); v != nil {
		topK = *v
	}
	var rid *uuid.UUID
	if uid, uerr := requireUserID(tc); uerr == nil {
		rid = &uid
	}
	out, err := t.wf.Execute(ctx, listingID, topK, rid)
	if err != nil {
		return ToolResult{}, err
	}
	return Succeeded(out), nil
}
