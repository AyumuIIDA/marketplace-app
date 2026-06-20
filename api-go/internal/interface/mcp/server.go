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
	// Stateless: セッションをサーバ側に保持しない（毎リクエスト独立）。
	// 認証は per-request の Bearer/dev ヘッダで完結するためセッション不要。これにより api 再起動や
	// クライアント再接続で "session not found" が起きず、外部MCPクライアントの接続が壊れにくい。
	return mcp.NewStreamableHTTPHandler(func(r *http.Request) *mcp.Server {
		userID, _ := resolveUser(r)
		var agentID *string
		if v := r.Header.Get(xAgentIDHeader); v != "" {
			agentID = &v
		}
		return buildServer(tools, runner, ToolContext{UserID: userID, AgentID: agentID})
	}, &mcp.StreamableHTTPOptions{Stateless: true})
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
	// MCP仕様: structuredContent を返す場合でも、後方互換のため同じデータを TextContent にも入れる。
	// 多くのclient(Claude Desktop等)はモデルに content のテキストだけを渡すため、ここに実データ(JSON)を
	// 入れないと「成功したが中身が見えない」状態になる。SUCCEEDED は Data を、要確認/要署名は説明＋Data を返す。
	dataJSON := func() string {
		if result.Data == nil {
			return ""
		}
		if b, err := json.Marshal(result.Data); err == nil {
			return string(b)
		}
		return ""
	}

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
		if d := dataJSON(); d != "" {
			text += "\n" + d
		}
	case ToolRequiresHumanSignature:
		text = "This tool requires a human signature before it can continue."
		if d := dataJSON(); d != "" {
			text += "\n" + d
		}
	default: // ToolSucceeded
		if d := dataJSON(); d != "" {
			text = d
		}
	}
	// 画像ブロックを先頭に積む。Data 有→インライン(ImageContent/base64・確実描画)、無→ResourceLink(軽量)。
	// リッチclient(Desktop/ChatGPT等)が描画し、テキスト面のclientは text/リンクへ劣化する。
	content := make([]mcp.Content, 0, len(result.Images)+1)
	for _, img := range result.Images {
		if len(img.Data) > 0 {
			content = append(content, &mcp.ImageContent{Data: img.Data, MIMEType: img.MimeType})
		} else if img.URL != "" {
			content = append(content, &mcp.ResourceLink{URI: img.URL, Name: img.Title, MIMEType: img.MimeType})
		}
	}
	content = append(content, &mcp.TextContent{Text: text})
	return &mcp.CallToolResult{
		Content:           content,
		StructuredContent: result,
		IsError:           result.Status == ToolFailed,
	}
}
