// Package mcpgateway は MCP tool gateway の抽象（interface + 入出力DTO）を置くリーフパッケージ。
// workflows(orchestration) と mcpinterface(具象実装) の双方が依存しても循環しないよう、
// 何もimportしない中立層に切り出している。
package mcpgateway

import "context"

// McpToolCallGatewayInput / Output は discover agent からMCP toolを呼ぶ際の入出力。
// TS版 in-process gateway と同形（structuredContent + 人間/LLM向け content text）。
type McpToolCallGatewayInput struct {
	Name      string
	Arguments map[string]any
}

type McpToolCallGatewayOutput struct {
	StructuredContent map[string]any
	ContentText       string
}

// McpToolGateway は agent runtime が監査付きでMCP toolを呼ぶためのport。
type McpToolGateway interface {
	CallTool(ctx context.Context, in McpToolCallGatewayInput) (McpToolCallGatewayOutput, error)
}
