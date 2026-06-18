package mcpinterface

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const xAgentIDHeader = "X-Agent-Id"

// objectSchema は引数なし/任意objectを表す最小のJSON Schema（client広告用）。
var objectSchema = json.RawMessage(`{"type":"object"}`)

// CurrentUserResolver はリクエストから認証主体のuserIdを取り出す。
type CurrentUserResolver func(r *http.Request) (string, bool)

// NewHTTPHandler は /mcp 用のstateless streamable HTTP handlerを返す。
// リクエスト毎にcontext(userId+agentId)を束ねたMCP serverを構築する。
func NewHTTPHandler(tools []McpTool, runner *ToolRunner, resolveUser CurrentUserResolver) http.Handler {
	return mcp.NewStreamableHTTPHandler(func(r *http.Request) *mcp.Server {
		userID, _ := resolveUser(r)
		var agentID *string
		if v := r.Header.Get(xAgentIDHeader); v != "" {
			agentID = &v
		}
		return buildServer(tools, runner, ToolContext{UserID: userID, AgentID: agentID})
	}, nil)
}

// buildServer はcontextを束ねてtool群を登録したMCP serverを構築する（in-process gatewayでも使う）。
func buildServer(tools []McpTool, runner *ToolRunner, toolCtx ToolContext) *mcp.Server {
	server := mcp.NewServer(&mcp.Implementation{Name: "human-backed-marketplace", Version: "0.1.0"}, nil)
	for _, t := range tools {
		tool := t
		server.AddTool(&mcp.Tool{Name: tool.Name(), InputSchema: objectSchema}, func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args := map[string]any{}
			if len(req.Params.Arguments) > 0 {
				_ = json.Unmarshal(req.Params.Arguments, &args)
			}
			result := runner.Run(ctx, tool, args, toolCtx)
			return toCallToolResult(result), nil
		})
	}
	return server
}

func toCallToolResult(result ToolResult) *mcp.CallToolResult {
	text := "Tool call succeeded."
	switch result.Status {
	case ToolFailed:
		if result.Error != nil {
			text = result.Error.Code + ": " + result.Error.Message
		} else {
			text = "Tool call failed."
		}
	case ToolRequiresConfirmation:
		text = "This tool requires user confirmation before it can continue."
	case ToolRequiresHumanSignature:
		text = "This tool requires a human signature before it can continue."
	}
	return &mcp.CallToolResult{
		Content:           []mcp.Content{&mcp.TextContent{Text: text}},
		StructuredContent: result,
		IsError:           result.Status == ToolFailed,
	}
}
