// Package mcpinterface はMCP server/tool/transportを集約する（coding-style §19）。
// 各toolは既存module/workflowのUseCaseを薄くラップし、runner経由で監査記録する。
package mcpinterface

import (
	"context"

	"marketplace/api-go/internal/shared/apperr"
)

// ToolContext はtool実行の主体（BFFが確定したuserId, 任意のagentId）。
type ToolContext struct {
	UserID  string
	AgentID *string
}

// ToolStatus はtool実行結果の状態。
type ToolStatus string

const (
	ToolSucceeded              ToolStatus = "SUCCEEDED"
	ToolFailed                 ToolStatus = "FAILED"
	ToolRequiresHumanSignature ToolStatus = "REQUIRES_HUMAN_SIGNATURE"
	ToolRequiresConfirmation   ToolStatus = "REQUIRES_CONFIRMATION"
)

// ToolError はFAILED時のエラー詳細（structuredContent向け）。
type ToolError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ToolImage はclientに返す画像コンテンツブロック。
// Data 非nil＝インライン(ImageContent/base64・確実に描画される)、nil＝URL参照(ResourceLink・軽量)。
type ToolImage struct {
	URL      string
	Title    string
	MimeType string
	Data     []byte
}

// ToolResult はtool実行結果。SUCCEEDED/REQUIRES_*はData、FAILEDはError。
// Images はリッチclient向けの画像ブロック（任意）。structuredContentには含めない（base64二重化防止）。
type ToolResult struct {
	Status ToolStatus  `json:"status"`
	Data   any         `json:"data,omitempty"`
	Error  *ToolError  `json:"error,omitempty"`
	Images []ToolImage `json:"-"`
}

// ImageFetcher は画像URLからバイト列を取得する（get_listing のヒーロー画像インライン化用）。
// 実装(adapter)は composition root が注入する。未注入/失敗時は ResourceLink へ劣化する。
type ImageFetcher interface {
	Fetch(ctx context.Context, url string) (data []byte, mimeType string, err error)
}

// McpTool は単一MCPツールの契約。input は client から受け取った引数（JSON object）。
type McpTool interface {
	Name() string
	Execute(ctx context.Context, input map[string]any, toolCtx ToolContext) (ToolResult, error)
}

// Succeeded/RequiresConfirmation/RequiresHumanSignature/Failed はResult構築ヘルパ。
func Succeeded(data any) ToolResult { return ToolResult{Status: ToolSucceeded, Data: data} }

// SucceededWithImages は画像ブロック付きの成功結果。get_listing のリッチ描画に使う。
func SucceededWithImages(data any, images []ToolImage) ToolResult {
	return ToolResult{Status: ToolSucceeded, Data: data, Images: images}
}
func RequiresConfirmation(data any) ToolResult {
	return ToolResult{Status: ToolRequiresConfirmation, Data: data}
}
func RequiresHumanSignature(data any) ToolResult {
	return ToolResult{Status: ToolRequiresHumanSignature, Data: data}
}

// Failed はerrorをFAILED結果へ正規化する（AppErrorのcode/messageを保持）。
func Failed(err error) ToolResult {
	if ae, ok := apperr.As(err); ok {
		return ToolResult{Status: ToolFailed, Error: &ToolError{Code: ae.Code, Message: ae.Message}}
	}
	return ToolResult{Status: ToolFailed, Error: &ToolError{Code: "UNKNOWN_ERROR", Message: "Unknown MCP tool error."}}
}
