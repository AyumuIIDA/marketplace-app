package workflows

import (
	"context"
	"strings"

	"github.com/google/uuid"

	agentsapp "marketplace/api-go/internal/modules/agents/application"
	listingsapp "marketplace/api-go/internal/modules/listings/application"
	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
)

// 取得経路。意味検索が空（基盤障害でも該当なしでも戻り値は同一）のとき SQL keyword へ縮退する。
const (
	retrievalSemantic = "semantic"
	retrievalKeyword  = "keyword"
)

// DiscoverRagResult は単段RAG（取得→生成）の応答。items は根拠となった候補（フロント互換の検索結果形）。
// retrievalMode は実際に使った取得経路（semantic / keyword）。手順表示を事実と一致させるために返す。
type DiscoverRagResult struct {
	AssistantMessage string          `json:"assistantMessage"`
	Items            []ScoredListing `json:"items"`
	RetrievalMode    string          `json:"retrievalMode"`
}

// KeywordSearch は意味検索が空のときの縮退先（SQL keyword 検索）。listings の SearchListings を満たす。
type KeywordSearch interface {
	Execute(ctx context.Context, in listingsapp.SearchListingsInput) (listingsapp.SearchListingsResult, error)
}

// DiscoverRagWorkflow は「意味検索で候補取得 → LLMで根拠付き回答生成」の単段RAG。
// retrieval=SemanticSearchWorkflow(VectorIndex＋hydrate)、generation=DiscoverAgentResponder を再利用し、
// 多段ツールループ無しで堅牢・低コスト・多言語（埋め込みが横断ヒット）にする。
// 意味検索が空のときは keyword(SQL/Postgres・vector基盤から独立) へ縮退し、障害時も検索を止めない。
type DiscoverRagWorkflow struct {
	search     *SemanticSearchWorkflow
	keyword    KeywordSearch
	registry   *agentsapp.DiscoverAgentRegistry
	categories CategoryLister
}

// CategoryLister は既存出品のユニークなカテゴリを返す（planner にカテゴリスラッグを提示するため）。
type CategoryLister func(ctx context.Context) ([]string, error)

func NewDiscoverRagWorkflow(search *SemanticSearchWorkflow, keyword KeywordSearch, registry *agentsapp.DiscoverAgentRegistry) *DiscoverRagWorkflow {
	return &DiscoverRagWorkflow{search: search, keyword: keyword, registry: registry}
}

// WithCategories は planner へ渡す既存カテゴリの reader を注入する（任意。未注入なら提示しない）。
func (w *DiscoverRagWorkflow) WithCategories(l CategoryLister) *DiscoverRagWorkflow {
	w.categories = l
	return w
}

// 取得は多めに行い、表示はLLMが選別する（CLIPノイズ/データ偏りの除去）。
const discoverRagTopK = 16

// Execute は query を意味検索し、取得候補のみを文脈に LLM で回答を生成する（grounding）。
func (w *DiscoverRagWorkflow) Execute(ctx context.Context, query, provider string, requesterID uuid.UUID) (DiscoverRagResult, error) {
	agent := w.registry.Resolve(provider)

	retrieved, mode, err := w.retrieve(ctx, query, requesterID, agent.Planner)
	if err != nil {
		return DiscoverRagResult{}, err
	}

	candidates := make([]agentsapp.DiscoverListing, 0, len(retrieved))
	for _, it := range retrieved {
		candidates = append(candidates, agentsapp.DiscoverListing{
			ListingID: it.ListingID,
			Title:     it.Title,
			Price:     it.Price,
			Currency:  it.Currency,
			Category:  it.Category,
			Condition: it.Condition,
			Signed:    it.SignatureID != nil,
			Status:    it.Status,
		})
	}

	reply, err := agent.Responder.BuildReply(ctx, agentsapp.BuildDiscoverReplyInput{
		UserMessage: query,
		Listings:    candidates,
	})
	if err != nil {
		return DiscoverRagResult{}, err
	}

	// 表示タイルはLLMが選んだ listingId のみ・関連順（取得候補からの部分集合）。
	byID := make(map[string]ScoredListing, len(retrieved))
	for _, it := range retrieved {
		byID[it.ListingID] = it
	}
	items := make([]ScoredListing, 0, len(reply.ListingIDs))
	for _, id := range reply.ListingIDs {
		if it, ok := byID[id]; ok {
			items = append(items, it)
		}
	}

	return DiscoverRagResult{AssistantMessage: reply.AssistantMessage, Items: items, RetrievalMode: mode}, nil
}

// retrieve は意味検索を試し、空（障害 or 該当なし）なら SQL keyword 検索へ縮退する。
// 戻り値は両経路で同じ ScoredListing 形に正規化する（生成・選別は取得元に非依存）。
func (w *DiscoverRagWorkflow) retrieve(ctx context.Context, query string, requesterID uuid.UUID, planner agentsapp.DiscoverAgentPlanner) ([]ScoredListing, string, error) {
	published := "PUBLISHED"
	rid := requesterID
	semantic, err := w.search.Execute(ctx, query,
		recommendationapp.SearchFilter{Status: &published}, discoverRagTopK, &rid)
	if err != nil {
		return nil, retrievalSemantic, err
	}
	if len(semantic.Items) > 0 {
		return semantic.Items, retrievalSemantic, nil
	}

	// 意味検索が空 → keyword(SQL) へ縮退。keyword も空なら responder が「条件を広げて」を返す。
	items, err := w.keywordFallback(ctx, query, planner)
	if err != nil {
		return nil, retrievalKeyword, err
	}
	return items, retrievalKeyword, nil
}

// keywordFallback は自然文を planner(LLM、失敗時deterministic) で検索語＋フィルタへ変換してから SQL を引く。
// 生の自然文を ILIKE しても「文全体の部分一致」になり何にも一致しないため、抽出が必須。
func (w *DiscoverRagWorkflow) keywordFallback(ctx context.Context, query string, planner agentsapp.DiscoverAgentPlanner) ([]ScoredListing, error) {
	// 既存カテゴリを planner に提示し、クエリが該当するなら category スラッグを正しく埋めさせる。
	var cats []string
	if w.categories != nil {
		if c, err := w.categories(ctx); err == nil {
			cats = c
		}
	}
	plan, err := planner.PlanTool(ctx, agentsapp.PlanDiscoverToolInput{UserMessage: query, Categories: cats})
	if err != nil {
		return nil, err
	}

	limit := int32(discoverRagTopK)
	base := listingsapp.SearchListingsInput{
		Category:  argString(plan.Arguments, "category"),
		Condition: argString(plan.Arguments, "condition"),
		MinPrice:  argInt32(plan.Arguments, "minPrice"),
		MaxPrice:  argInt32(plan.Arguments, "maxPrice"),
		Limit:     &limit,
	}
	return w.unionKeywordSearch(ctx, base, keywordTokens(plan.Arguments))
}

// keywordTokens は planner の keyword を語に割る。LLM が複数語を返した場合に OR 一致できるよう
// Fields で分割する（単一語ならそのまま1語）。空なら nil＝フィルタのみ検索にフォールバックする。
func keywordTokens(args map[string]any) []string {
	if kw := argString(args, "keyword"); kw != nil {
		return strings.Fields(*kw)
	}
	return nil
}

// unionKeywordSearch は語ごとに SQL を引き、ListingID で重複排除しつつ最初の出現順を保って結合する。
// 語が無ければフィルタのみで1回引く。最大 discoverRagTopK 件で打ち切る。
func (w *DiscoverRagWorkflow) unionKeywordSearch(ctx context.Context, base listingsapp.SearchListingsInput, tokens []string) ([]ScoredListing, error) {
	seen := make(map[string]struct{})
	out := make([]ScoredListing, 0, discoverRagTopK)
	collect := func(items []listingsapp.ListingView) {
		for _, lv := range items {
			if len(out) >= discoverRagTopK {
				return
			}
			if _, dup := seen[lv.ListingID]; dup {
				continue
			}
			seen[lv.ListingID] = struct{}{}
			// keyword一致は vector 距離を持たない。score=0 で正直に表す。
			out = append(out, ScoredListing{ListingView: lv, Score: 0})
		}
	}

	if len(tokens) == 0 {
		res, err := w.keyword.Execute(ctx, base)
		if err != nil {
			return nil, err
		}
		collect(res.Items)
		return out, nil
	}

	for _, token := range tokens {
		in := base
		term := token
		in.Keyword = &term
		res, err := w.keyword.Execute(ctx, in)
		if err != nil {
			return nil, err
		}
		collect(res.Items)
		if len(out) >= discoverRagTopK {
			break
		}
	}
	return out, nil
}

// argString は plan.Arguments[key] を非空文字列として取り出す（無効は nil）。
func argString(args map[string]any, key string) *string {
	v, ok := args[key]
	if !ok {
		return nil
	}
	s, ok := v.(string)
	if !ok {
		return nil
	}
	if s = strings.TrimSpace(s); s == "" {
		return nil
	}
	return &s
}

// argInt32 は plan.Arguments[key] を正の int32 として取り出す。
// LLM の JSON は数値を float64、deterministic は int で渡すため両方を受ける。
func argInt32(args map[string]any, key string) *int32 {
	v, ok := args[key]
	if !ok {
		return nil
	}
	var n int32
	switch x := v.(type) {
	case float64:
		n = int32(x)
	case int:
		n = int32(x)
	case int32:
		n = x
	case int64:
		n = int32(x)
	default:
		return nil
	}
	if n <= 0 {
		return nil
	}
	return &n
}
