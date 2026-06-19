package mcpinterface

import (
	"context"
	"strings"

	"marketplace/api-go/internal/shared/apperr"
)

// present_discover_output は discover agent の最終出力(assistantMessage + listingIds)を
// スキーマ検証する出力tool。副作用は持たず、検証済みのpayloadをそのまま返す。
type presentDiscoverOutputTool struct{}

func (presentDiscoverOutputTool) Name() string { return "present_discover_output" }

func (presentDiscoverOutputTool) Execute(_ context.Context, in map[string]any, _ ToolContext) (ToolResult, error) {
	message := strings.TrimSpace(argStrRaw(in, "assistantMessage"))
	if message == "" || len([]rune(message)) > 4000 {
		return ToolResult{}, apperr.Validation(
			"assistantMessage is required and must be at most 4000 characters.",
			apperr.FieldError{Field: "assistantMessage", Reason: "length"})
	}

	listingIDs := argStrSlice(in, "listingIds")
	if listingIDs == nil {
		listingIDs = []string{}
	}
	// LLMが上限超のidを渡しても run を落とさず先頭24件へ切り詰める（discover出力は最大24件表示）。
	if len(listingIDs) > 24 {
		listingIDs = listingIDs[:24]
	}

	return Succeeded(map[string]any{
		"assistantMessage": message,
		"listingIds":       listingIDs,
	}), nil
}
