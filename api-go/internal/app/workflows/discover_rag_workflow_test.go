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

// fakeKeyword は SQL keyword 検索の代役。呼び出し回数と最後に渡された keyword を記録し、
// 「縮退が発火したか」「生の自然文ではなく抽出済みの語で引いたか」を検証できる。
type fakeKeyword struct {
	items       []listingsapp.ListingView
	err         error
	calls       int
	lastKeyword *string
}

func (f *fakeKeyword) Execute(_ context.Context, in listingsapp.SearchListingsInput) (listingsapp.SearchListingsResult, error) {
	f.calls++
	f.lastKeyword = in.Keyword
	return listingsapp.SearchListingsResult{Items: f.items}, f.err
}

// fakePlanner は planner の代役。自然文→検索語抽出を固定の keyword で代用する。
type fakePlanner struct {
	keyword string
	calls   int
}

func (f *fakePlanner) PlanTool(context.Context, agentsapp.PlanDiscoverToolInput) (agentsapp.DiscoverToolPlan, error) {
	f.calls++
	return agentsapp.DiscoverToolPlan{
		ToolName:  "search_listings",
		Arguments: map[string]any{"keyword": f.keyword},
	}, nil
}

// echoResponder は与えられた候補の listingId を全件そのまま選ぶ。取得元の検証に集中するため生成は素通し。
type echoResponder struct{}

func (echoResponder) BuildReply(_ context.Context, in agentsapp.BuildDiscoverReplyInput) (agentsapp.BuildDiscoverReplyOutput, error) {
	ids := make([]string, 0, len(in.Listings))
	for _, l := range in.Listings {
		ids = append(ids, l.ListingID)
	}
	return agentsapp.BuildDiscoverReplyOutput{AssistantMessage: "ok", ListingIDs: ids}, nil
}

func newRagWorkflow(index recommendationapp.VectorIndex, keyword KeywordSearch, planner agentsapp.DiscoverAgentPlanner) *DiscoverRagWorkflow {
	lookup := func(_ context.Context, id uuid.UUID, _ *uuid.UUID) (listingsapp.ListingView, error) {
		return listingsapp.ListingView{ListingID: id.String(), Title: "semantic-" + id.String()}, nil
	}
	registry := agentsapp.NewDiscoverAgentRegistry("test", map[string]agentsapp.DiscoverAgentSet{
		"test": {Planner: planner, Responder: echoResponder{}},
	})
	return NewDiscoverRagWorkflow(NewSemanticSearchWorkflow(index, lookup), keyword, registry)
}

func kwView(title string) listingsapp.ListingView {
	return listingsapp.ListingView{ListingID: uuid.New().String(), Title: title}
}

// semantic がヒットする限り keyword は呼ばれず、mode=semantic を返す。
func TestDiscoverRag_SemanticHit_NoKeywordFallback(t *testing.T) {
	id := uuid.New()
	index := fakeIndex{hits: []recommendationapp.SearchHit{{ListingID: id.String(), Score: 0.9}}}
	keyword := &fakeKeyword{items: []listingsapp.ListingView{kwView("should-not-be-used")}}
	planner := &fakePlanner{keyword: "should-not-be-used"}

	out, err := newRagWorkflow(index, keyword, planner).Execute(context.Background(), "q", "test", uuid.New())
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if out.RetrievalMode != retrievalSemantic {
		t.Fatalf("retrievalMode = %q, want %q", out.RetrievalMode, retrievalSemantic)
	}
	if keyword.calls != 0 || planner.calls != 0 {
		t.Fatalf("fallback must not run on semantic hit; keyword=%d planner=%d", keyword.calls, planner.calls)
	}
	if len(out.Items) != 1 || out.Items[0].ListingID != id.String() {
		t.Fatalf("items = %+v", out.Items)
	}
}

// semantic が空（障害でも該当なしでも同一）なら keyword(SQL) へ縮退し、mode=keyword を返す。
func TestDiscoverRag_SemanticEmpty_FallsBackToKeyword(t *testing.T) {
	index := fakeIndex{hits: nil} // 障害→空 も該当なし→空 も、workflow からは区別不能（resilient decorator が error→空に変換）
	keyword := &fakeKeyword{items: []listingsapp.ListingView{kwView("alpha"), kwView("beta")}}
	// planner が自然文 "シルバーのネックレスが欲しい…" から "ネックレス" を抽出した想定。
	planner := &fakePlanner{keyword: "ネックレス"}

	out, err := newRagWorkflow(index, keyword, planner).Execute(context.Background(), "シルバーのネックレスが欲しい、1万円以下で", "test", uuid.New())
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if out.RetrievalMode != retrievalKeyword {
		t.Fatalf("retrievalMode = %q, want %q", out.RetrievalMode, retrievalKeyword)
	}
	if planner.calls != 1 {
		t.Fatalf("planner should extract once, calls = %d", planner.calls)
	}
	if keyword.calls != 1 {
		t.Fatalf("keyword fallback should fire once, calls = %d", keyword.calls)
	}
	// 生の自然文ではなく planner が抽出した語で SQL を引く（これが今回の修正の核心）。
	if keyword.lastKeyword == nil || *keyword.lastKeyword != "ネックレス" {
		t.Fatalf("SQL keyword should be the extracted term, got %v", keyword.lastKeyword)
	}
	if len(out.Items) != 2 {
		t.Fatalf("want 2 keyword items, got %d (%+v)", len(out.Items), out.Items)
	}
	if out.Items[0].Score != 0 {
		t.Errorf("keyword hit score should be 0, got %v", out.Items[0].Score)
	}
}

// semantic も keyword も空なら候補ゼロ。mode=keyword、items 空（responder の「広げて」分岐へ繋がる）。
func TestDiscoverRag_BothEmpty_ReturnsNoItems(t *testing.T) {
	index := fakeIndex{hits: nil}
	keyword := &fakeKeyword{items: nil}
	planner := &fakePlanner{keyword: "ネックレス"}

	out, err := newRagWorkflow(index, keyword, planner).Execute(context.Background(), "q", "test", uuid.New())
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

// semantic が hard error（resilient decorator で包まれていない経路）はそのまま伝播し、keyword 縮退はしない。
// 本番は ResilientVectorIndex が error→空に変換するため、この経路は空→keyword 縮退として現れる。
func TestDiscoverRag_SemanticHardError_Propagates(t *testing.T) {
	index := fakeIndex{err: apperr.Infrastructure("boom", nil)}
	keyword := &fakeKeyword{}
	planner := &fakePlanner{keyword: "ネックレス"}

	_, err := newRagWorkflow(index, keyword, planner).Execute(context.Background(), "q", "test", uuid.New())
	if err == nil {
		t.Fatal("expected semantic hard error to propagate")
	}
	if keyword.calls != 0 || planner.calls != 0 {
		t.Fatalf("fallback must not run on hard error; keyword=%d planner=%d", keyword.calls, planner.calls)
	}
}
