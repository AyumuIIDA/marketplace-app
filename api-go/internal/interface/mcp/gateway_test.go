package mcpinterface

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"

	"marketplace/api-go/internal/interface/mcp/mcpgateway"
)

func TestInProcessGateway_PresentDiscoverOutput_Succeeds(t *testing.T) {
	runner, repo := newTestRunner(t)
	gw := NewInProcessMcpToolGateway(
		[]McpTool{presentDiscoverOutputTool{}},
		runner,
		ToolContext{UserID: uuid.NewString()},
	)

	out, err := gw.CallTool(context.Background(), mcpgateway.McpToolCallGatewayInput{
		Name: "present_discover_output",
		Arguments: map[string]any{
			"assistantMessage": "Found 2 sneakers under your budget.",
			"listingIds":       []any{"00000000-0000-4000-8000-000000000001"},
		},
	})
	if err != nil {
		t.Fatalf("CallTool: %v", err)
	}

	if out.StructuredContent["status"] != "SUCCEEDED" {
		t.Fatalf("status = %v, want SUCCEEDED", out.StructuredContent["status"])
	}
	data, ok := out.StructuredContent["data"].(map[string]any)
	if !ok {
		t.Fatalf("data is not an object: %T", out.StructuredContent["data"])
	}
	if data["assistantMessage"] != "Found 2 sneakers under your budget." {
		t.Fatalf("assistantMessage = %v", data["assistantMessage"])
	}
	// content text は人間/LLM向けの短い要約。
	// 成功結果は content テキストにも実データ(JSON)が入る（client がモデルに渡せるよう）。
	if !strings.Contains(out.ContentText, "Found 2 sneakers under your budget.") {
		t.Fatalf("contentText should carry the data JSON, got %q", out.ContentText)
	}
	// 監査記録される。
	if len(repo.saved) != 1 {
		t.Fatalf("expected 1 audit record, got %d", len(repo.saved))
	}
}

func TestInProcessGateway_PresentDiscoverOutput_RejectsEmptyMessage(t *testing.T) {
	runner, _ := newTestRunner(t)
	gw := NewInProcessMcpToolGateway(
		[]McpTool{presentDiscoverOutputTool{}},
		runner,
		ToolContext{UserID: uuid.NewString()},
	)

	out, err := gw.CallTool(context.Background(), mcpgateway.McpToolCallGatewayInput{
		Name:      "present_discover_output",
		Arguments: map[string]any{"assistantMessage": "   "},
	})
	if err != nil {
		t.Fatalf("CallTool transport error: %v", err)
	}
	if out.StructuredContent["status"] != "FAILED" {
		t.Fatalf("status = %v, want FAILED", out.StructuredContent["status"])
	}
}
