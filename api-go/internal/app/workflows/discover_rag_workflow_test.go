package workflows

import (
	"context"
	"testing"

	"github.com/google/uuid"

	agentsapp "marketplace/api-go/internal/modules/agents/application"
	listingsapp "marketplace/api-go/internal/modules/listings/application"
	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
	"marketplace/api-go/internal/shared/apperr"
)

// fakeAgent は意味検索が空のときのフォールバック先（エージェント検索）の代役。
// 呼び出し回数を数え、固定の結果を返す。
type fakeAgent struct {
	result RunDiscoverAgentResult
	calls  int
}

func (f *fakeAgent) Execute(context.Context, RunDiscoverAgentInput) (RunDiscoverAgentResult, error) {
	f.calls++
	return f.result, nil
}

// echoResponder は与えられた候補の listingId を全件そのまま選ぶ。意味検索ヒット経路の検証用。
type echoResponder struct{}

func (echoResponder) BuildReply(_ context.Context, in agentsapp.BuildDiscoverReplyInput) (agentsapp.BuildDiscoverReplyOutput, error) {
	ids := make([]string, 0, len(in.Listings))
	for _, l := range in.Listings {
		ids = append(ids, l.ListingID)
	}
	return agentsapp.BuildDiscoverReplyOutput{AssistantMessage: "ok", ListingIDs: ids}, nil
}

func newRagWorkflow(index recommendationapp.VectorIndex, agent AgentSearch) *DiscoverRagWorkflow {
	lookup := func(_ context.Context, id uuid.UUID, _ *uuid.UUID) (listingsapp.ListingView, error) {
		return listingsapp.ListingView{ListingID: id.String(), Title: "semantic-" + id.String()}, nil
	}
	registry := agentsapp.NewDiscoverAgentRegistry("test", map[string]agentsapp.DiscoverAgentSet{
		"test": {Responder: echoResponder{}},
	})
	wf := NewDiscoverRagWorkflow(NewSemanticSearchWorkflow(index, lookup), registry)
	if agent != nil {
		wf.WithAgentFallback(agent)
	}
	return wf
}

// 意味検索がヒットする限りフォールバックは呼ばれず、mode=semantic を返す。
func TestDiscoverRag_SemanticHit_NoFallback(t *testing.T) {
	id := uuid.New()
	index := fakeIndex{hits: []recommendationapp.SearchHit{{ListingID: id.String(), Score: 0.9}}}
	agent := &fakeAgent{}

	out, err := newRagWorkflow(index, agent).Execute(context.Background(), "q", "test", uuid.New())
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if out.RetrievalMode != retrievalSemantic {
		t.Fatalf("retrievalMode = %q, want %q", out.RetrievalMode, retrievalSemantic)
	}
	if agent.calls != 0 {
		t.Fatalf("agent fallback must not run on semantic hit, calls = %d", agent.calls)
	}
	if len(out.Items) != 1 || out.Items[0].ListingID != id.String() {
		t.Fatalf("items = %+v", out.Items)
	}
}

// 意味検索が空（障害でも該当なしでも同一）なら、実証済みエージェント検索へ委譲し mode=keyword を返す。
func TestDiscoverRag_SemanticEmpty_DelegatesToAgent(t *testing.T) {
	index := fakeIndex{hits: nil}
	agent := &fakeAgent{result: RunDiscoverAgentResult{
		AssistantMessage: "found by agent",
		Listings: []listingsapp.ListingView{
			{ListingID: uuid.New().String(), Title: "alpha"},
			{ListingID: uuid.New().String(), Title: "beta"},
		},
	}}

	out, err := newRagWorkflow(index, agent).Execute(context.Background(), "シルバーのネックレスが欲しい", "test", uuid.New())
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if out.RetrievalMode != retrievalKeyword {
		t.Fatalf("retrievalMode = %q, want %q", out.RetrievalMode, retrievalKeyword)
	}
	if agent.calls != 1 {
		t.Fatalf("agent fallback should run once, calls = %d", agent.calls)
	}
	if out.AssistantMessage != "found by agent" {
		t.Fatalf("assistantMessage = %q, want the agent's reply", out.AssistantMessage)
	}
	if len(out.Items) != 2 || out.Items[0].Title != "alpha" {
		t.Fatalf("items = %+v, want the agent's listings", out.Items)
	}
	if out.Items[0].Score != 0 {
		t.Errorf("keyword hit score should be 0, got %v", out.Items[0].Score)
	}
}

// フォールバック未注入なら意味検索のみ。空はそのまま空を返す（responder は呼ばれない）。
func TestDiscoverRag_SemanticEmpty_NoFallbackInjected(t *testing.T) {
	index := fakeIndex{hits: nil}

	out, err := newRagWorkflow(index, nil).Execute(context.Background(), "q", "test", uuid.New())
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if out.RetrievalMode != retrievalKeyword {
		t.Fatalf("retrievalMode = %q, want %q", out.RetrievalMode, retrievalKeyword)
	}
	if len(out.Items) != 0 {
		t.Fatalf("want 0 items, got %d", len(out.Items))
	}
}

// semantic の hard error はそのまま伝播し、フォールバックは呼ばない。
// 本番は ResilientVectorIndex が error→空に変換するため、この経路は空→エージェント委譲として現れる。
func TestDiscoverRag_SemanticHardError_Propagates(t *testing.T) {
	index := fakeIndex{err: apperr.Infrastructure("boom", nil)}
	agent := &fakeAgent{}

	_, err := newRagWorkflow(index, agent).Execute(context.Background(), "q", "test", uuid.New())
	if err == nil {
		t.Fatal("expected semantic hard error to propagate")
	}
	if agent.calls != 0 {
		t.Fatalf("agent fallback must not run on hard error, calls = %d", agent.calls)
	}
}
