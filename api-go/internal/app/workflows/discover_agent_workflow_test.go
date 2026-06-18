package workflows_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/outarc/marketplace/api-go/internal/app/workflows"
	mcpinterface "github.com/outarc/marketplace/api-go/internal/interface/mcp"
	"github.com/outarc/marketplace/api-go/internal/interface/mcp/mcpgateway"
	agentsinfra "github.com/outarc/marketplace/api-go/internal/modules/agents/infrastructure"
	listingsapp "github.com/outarc/marketplace/api-go/internal/modules/listings/application"
	listingsdomain "github.com/outarc/marketplace/api-go/internal/modules/listings/domain"
	mcpauditapp "github.com/outarc/marketplace/api-go/internal/modules/mcpaudit/application"
	mcpauditdomain "github.com/outarc/marketplace/api-go/internal/modules/mcpaudit/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/clock"
	"github.com/outarc/marketplace/api-go/internal/shared/ids"
)

// --- test doubles ---

type discoverFakeRepo struct {
	byID map[uuid.UUID]*listingsdomain.Listing
}

func (r *discoverFakeRepo) Save(_ context.Context, l *listingsdomain.Listing) error {
	r.byID[l.ID()] = l
	return nil
}
func (r *discoverFakeRepo) SaveImages(_ context.Context, _ listingsdomain.SaveImagesInput) error {
	return nil
}
func (r *discoverFakeRepo) FindByID(_ context.Context, id uuid.UUID) (*listingsdomain.Listing, error) {
	return r.byID[id], nil
}
func (r *discoverFakeRepo) FindByIDs(_ context.Context, _ []uuid.UUID) ([]*listingsdomain.Listing, error) {
	return nil, nil
}
func (r *discoverFakeRepo) ClaimForPurchase(_ context.Context, _ listingsdomain.ClaimForPurchaseInput) (*listingsdomain.Listing, error) {
	return nil, nil
}
func (r *discoverFakeRepo) Search(_ context.Context, in listingsdomain.SearchInput) ([]*listingsdomain.Listing, error) {
	var out []*listingsdomain.Listing
	for _, l := range r.byID {
		if in.Status != nil && l.Status() != *in.Status {
			continue
		}
		if in.Keyword != nil && !strings.Contains(strings.ToLower(l.Fields().Title), strings.ToLower(*in.Keyword)) {
			continue
		}
		out = append(out, l)
	}
	return out, nil
}

type noopAuditRepo struct{}

func (noopAuditRepo) Save(_ context.Context, _ *mcpauditdomain.McpToolCall) error { return nil }

func seedPublished(t *testing.T, repo *discoverFakeRepo, title string, price int32) uuid.UUID {
	t.Helper()
	l, err := listingsdomain.NewDraft(listingsdomain.CreateDraftInput{
		ID:       uuid.New(),
		SellerID: uuid.New(),
		Fields:   listingsdomain.ListingFields{Title: title, Description: "d", Price: price, Currency: "JPY", Category: "fashion_shoes", Condition: "good"},
		Now:      time.Now(),
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := l.Publish(nil, time.Now()); err != nil {
		t.Fatal(err)
	}
	repo.byID[l.ID()] = l
	return l.ID()
}

func newDiscoverWorkflow(repo *discoverFakeRepo) *workflows.RunDiscoverAgentWorkflow {
	tools := mcpinterface.BuildTools(mcpinterface.ToolDeps{
		SearchListings: listingsapp.NewSearchListingsUseCase(repo),
		GetListing:     listingsapp.NewGetListingUseCase(repo),
	})
	runner := mcpinterface.NewToolRunner(
		mcpauditapp.NewRecordMcpToolCallUseCase(noopAuditRepo{}, ids.NewUUIDGenerator(), clock.NewSystemClock()),
	)
	factory := func(userID string, agentID *string) mcpgateway.McpToolGateway {
		return mcpinterface.NewInProcessMcpToolGateway(tools, runner, mcpinterface.ToolContext{UserID: userID, AgentID: agentID})
	}
	return workflows.NewRunDiscoverAgentWorkflow(factory,
		agentsinfra.NewDeterministicDiscoverAgentPlanner(),
		agentsinfra.NewDeterministicDiscoverAgentResponder())
}

func toolNames(calls []workflows.DiscoverToolCall) []string {
	out := make([]string, len(calls))
	for i, c := range calls {
		out[i] = c.ToolName
	}
	return out
}

// --- tests ---

func TestRunDiscoverAgent_SearchThenPresent(t *testing.T) {
	repo := &discoverFakeRepo{byID: map[uuid.UUID]*listingsdomain.Listing{}}
	seedPublished(t, repo, "Sneakers", 30000)
	wf := newDiscoverWorkflow(repo)

	out, err := wf.Execute(context.Background(), workflows.RunDiscoverAgentInput{
		UserID:  uuid.NewString(),
		Message: "Find Sneakers under 50000 JPY",
	})
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if out.Status != "COMPLETED" {
		t.Fatalf("status = %s", out.Status)
	}
	if len(out.Listings) != 1 || out.Listings[0].Title != "Sneakers" {
		t.Fatalf("listings = %+v", out.Listings)
	}
	if got := toolNames(out.ToolCalls); strings.Join(got, ",") != "search_listings,present_discover_output" {
		t.Fatalf("toolCalls = %v", got)
	}
	if !strings.Contains(out.AssistantMessage, "Sneakers") {
		t.Fatalf("assistantMessage = %q", out.AssistantMessage)
	}
}

func TestRunDiscoverAgent_GetListingPath(t *testing.T) {
	repo := &discoverFakeRepo{byID: map[uuid.UUID]*listingsdomain.Listing{}}
	id := seedPublished(t, repo, "Sneakers", 30000)
	wf := newDiscoverWorkflow(repo)

	out, err := wf.Execute(context.Background(), workflows.RunDiscoverAgentInput{
		UserID:  uuid.NewString(),
		Message: "Show detail for " + id.String(),
	})
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if len(out.Listings) != 1 || out.Listings[0].ListingID != id.String() {
		t.Fatalf("listings = %+v", out.Listings)
	}
	if got := toolNames(out.ToolCalls); strings.Join(got, ",") != "get_listing,present_discover_output" {
		t.Fatalf("toolCalls = %v", got)
	}
}

func TestRunDiscoverAgent_RejectsEmptyMessage(t *testing.T) {
	repo := &discoverFakeRepo{byID: map[uuid.UUID]*listingsdomain.Listing{}}
	wf := newDiscoverWorkflow(repo)
	if _, err := wf.Execute(context.Background(), workflows.RunDiscoverAgentInput{UserID: uuid.NewString(), Message: "   "}); err == nil {
		t.Fatal("expected validation error for empty message")
	}
}
