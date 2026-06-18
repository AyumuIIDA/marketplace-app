package mcpinterface

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	mcpauditapp "github.com/outarc/marketplace/api-go/internal/modules/mcpaudit/application"
	mcpauditdomain "github.com/outarc/marketplace/api-go/internal/modules/mcpaudit/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/clock"
	"github.com/outarc/marketplace/api-go/internal/shared/ids"
)

type countingAuditRepo struct{ saved []*mcpauditdomain.McpToolCall }

func (r *countingAuditRepo) Save(_ context.Context, c *mcpauditdomain.McpToolCall) error {
	r.saved = append(r.saved, c)
	return nil
}

type stubTool struct{ fail bool }

func (stubTool) Name() string { return "stub" }
func (s stubTool) Execute(_ context.Context, in map[string]any, _ ToolContext) (ToolResult, error) {
	if s.fail {
		return ToolResult{}, &stubErr{}
	}
	return Succeeded(map[string]any{"echo": in["x"]}), nil
}

type stubErr struct{}

func (stubErr) Error() string { return "stub failure" }

func runWithClient(t *testing.T, tools []McpTool, runner *ToolRunner, name string, args map[string]any) *mcp.CallToolResult {
	t.Helper()
	ctx := context.Background()
	server := buildServer(tools, runner, ToolContext{UserID: uuid.NewString()})
	ct, st := mcp.NewInMemoryTransports()
	if _, err := server.Connect(ctx, st, nil); err != nil {
		t.Fatalf("server connect: %v", err)
	}
	client := mcp.NewClient(&mcp.Implementation{Name: "test-client", Version: "0"}, nil)
	cs, err := client.Connect(ctx, ct, nil)
	if err != nil {
		t.Fatalf("client connect: %v", err)
	}
	defer cs.Close()
	res, err := cs.CallTool(ctx, &mcp.CallToolParams{Name: name, Arguments: args})
	if err != nil {
		t.Fatalf("call tool: %v", err)
	}
	return res
}

func newTestRunner(t *testing.T) (*ToolRunner, *countingAuditRepo) {
	t.Helper()
	repo := &countingAuditRepo{}
	uc := mcpauditapp.NewRecordMcpToolCallUseCase(repo, ids.NewUUIDGenerator(), clock.NewSystemClock())
	return NewToolRunner(uc), repo
}

func TestMcpServer_SucceededToolIsAudited(t *testing.T) {
	runner, repo := newTestRunner(t)
	res := runWithClient(t, []McpTool{stubTool{}}, runner, "stub", map[string]any{"x": "hi"})
	if res.IsError {
		t.Fatalf("expected success, got error result")
	}
	if len(repo.saved) != 1 {
		t.Fatalf("expected 1 audit record, got %d", len(repo.saved))
	}
	if repo.saved[0].Status() != mcpauditdomain.StatusSucceeded {
		t.Errorf("audit status = %s, want SUCCEEDED", repo.saved[0].Status())
	}
	if repo.saved[0].ToolName() != "stub" {
		t.Errorf("audit tool = %s", repo.saved[0].ToolName())
	}
}

func TestMcpServer_FailedToolIsAuditedAsError(t *testing.T) {
	runner, repo := newTestRunner(t)
	res := runWithClient(t, []McpTool{stubTool{fail: true}}, runner, "stub", nil)
	if !res.IsError {
		t.Fatal("expected error result for failing tool")
	}
	if len(repo.saved) != 1 || repo.saved[0].Status() != mcpauditdomain.StatusFailed {
		t.Fatalf("expected 1 FAILED audit record, got %+v", repo.saved)
	}
}
