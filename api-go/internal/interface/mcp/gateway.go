package mcpinterface

import (
	"context"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/outarc/marketplace/api-go/internal/interface/mcp/mcpgateway"
)

// InProcessMcpToolGateway は同一プロセス内でMCP client↔server をin-memory transportで結び、
// runner経由でtoolを実行する（= 全呼び出しが mcp_tool_calls へ監査記録される）。
// TS版同様、呼び出しごとにserver/sessionを構築して閉じる。
type InProcessMcpToolGateway struct {
	tools   []McpTool
	runner  *ToolRunner
	toolCtx ToolContext
}

func NewInProcessMcpToolGateway(tools []McpTool, runner *ToolRunner, toolCtx ToolContext) *InProcessMcpToolGateway {
	return &InProcessMcpToolGateway{tools: tools, runner: runner, toolCtx: toolCtx}
}

func (g *InProcessMcpToolGateway) CallTool(ctx context.Context, in mcpgateway.McpToolCallGatewayInput) (mcpgateway.McpToolCallGatewayOutput, error) {
	server := buildServer(g.tools, g.runner, g.toolCtx)
	clientTransport, serverTransport := mcp.NewInMemoryTransports()

	serverSession, err := server.Connect(ctx, serverTransport, nil)
	if err != nil {
		return mcpgateway.McpToolCallGatewayOutput{}, err
	}
	defer serverSession.Close()

	client := mcp.NewClient(&mcp.Implementation{Name: "discover-agent-runtime", Version: "0.1.0"}, nil)
	clientSession, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		return mcpgateway.McpToolCallGatewayOutput{}, err
	}
	defer clientSession.Close()

	res, err := clientSession.CallTool(ctx, &mcp.CallToolParams{
		Name:      in.Name,
		Arguments: in.Arguments,
	})
	if err != nil {
		return mcpgateway.McpToolCallGatewayOutput{}, err
	}

	out := mcpgateway.McpToolCallGatewayOutput{ContentText: extractContentText(res.Content)}
	if sc, ok := res.StructuredContent.(map[string]any); ok {
		out.StructuredContent = sc
	}
	return out, nil
}

func extractContentText(content []mcp.Content) string {
	parts := make([]string, 0, len(content))
	for _, c := range content {
		if tc, ok := c.(*mcp.TextContent); ok {
			parts = append(parts, tc.Text)
		}
	}
	return strings.Join(parts, "\n")
}

// コンパイル時にinterface実装を保証する。
var _ mcpgateway.McpToolGateway = (*InProcessMcpToolGateway)(nil)
