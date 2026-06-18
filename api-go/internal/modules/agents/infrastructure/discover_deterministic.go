package agentsinfra

import (
	"context"
	"encoding/json"
	"regexp"
	"strconv"
	"strings"

	agentsapp "github.com/outarc/marketplace/api-go/internal/modules/agents/application"
)

// 決定論版 discover planner/responder。LLM未設定（provider=deterministic）でも動く規則ベース実装。
// テスト/ローカル/デモの安定動作を担う（TS DeterministicDiscoverAgent* と同等のロジック）。

var (
	uuidRe       = regexp.MustCompile(`(?i)[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`)
	japaneseRe   = regexp.MustCompile(`[\p{Hiragana}\p{Katakana}\p{Han}]`)
	maxPriceRe   = regexp.MustCompile(`(\d[\d,]*)\s*(万円|円|jpy|JPY)?`)
	numberUnitRe = regexp.MustCompile(`(?i)\d[\d,]*\s*(万円|円|jpy|JPY)?`)
	signedRe     = regexp.MustCompile(`(?i)本人署名つき|本人署名付き|本人署名|署名つき|署名付き|署名済み|human-signed|human signed|verified`)
	stopwordRe   = regexp.MustCompile(`(?i)以下|未満|以内|くらい|ぐらい|under|below|less than|find|search|look for|show me|jpy|yen|price|価格|値段`)
	spacesRe     = regexp.MustCompile(`\s+`)
)

// DeterministicDiscoverAgentPlanner は規則ベースでMCP toolを選ぶ。
type DeterministicDiscoverAgentPlanner struct{}

func NewDeterministicDiscoverAgentPlanner() *DeterministicDiscoverAgentPlanner {
	return &DeterministicDiscoverAgentPlanner{}
}

func (DeterministicDiscoverAgentPlanner) PlanTool(_ context.Context, in agentsapp.PlanDiscoverToolInput) (agentsapp.DiscoverToolPlan, error) {
	text := effectiveMessage(in.UserMessage, in.Messages)
	listingIDs := uuidRe.FindAllString(text, -1)
	lower := strings.ToLower(text)

	if (strings.Contains(lower, "compare") || strings.Contains(text, "比較")) && len(listingIDs) >= 2 {
		ids := listingIDs
		if len(ids) > 5 {
			ids = ids[:5]
		}
		return agentsapp.DiscoverToolPlan{
			ToolName:  "compare_listings",
			Arguments: map[string]any{"listingIds": toAnySlice(ids)},
		}, nil
	}

	if len(listingIDs) >= 1 && (strings.Contains(lower, "detail") || strings.Contains(text, "詳細") || strings.Contains(lower, "show")) {
		return agentsapp.DiscoverToolPlan{
			ToolName:  "get_listing",
			Arguments: map[string]any{"listingId": listingIDs[0]},
		}, nil
	}

	if strings.Contains(lower, "price") || strings.Contains(text, "価格") || strings.Contains(text, "値段") {
		title := normalizeKeyword(text)
		if title == "" {
			title = "item"
		}
		return agentsapp.DiscoverToolPlan{
			ToolName:  "suggest_price",
			Arguments: map[string]any{"title": title, "category": "general", "condition": "good"},
		}, nil
	}

	return agentsapp.DiscoverToolPlan{
		ToolName:  "search_listings",
		Arguments: searchListingsArguments(in.UserMessage),
	}, nil
}

func effectiveMessage(message string, messages []agentsapp.DiscoverMessage) string {
	prev := make([]string, 0, len(messages))
	for _, m := range messages {
		c := strings.TrimSpace(m.Content)
		if c != "" {
			prev = append(prev, c)
		}
	}
	if len(prev) > 3 {
		prev = prev[len(prev)-3:]
	}
	if len(prev) == 0 {
		return message
	}
	return strings.Join(append(prev, message), " ")
}

func searchListingsArguments(message string) map[string]any {
	args := map[string]any{"limit": 24}
	if kw := normalizeKeyword(message); kw != "" {
		args["keyword"] = kw
	}
	if mp, ok := readMaxPrice(message); ok {
		args["maxPrice"] = mp
	}
	return args
}

func readMaxPrice(message string) (int, bool) {
	m := maxPriceRe.FindStringSubmatch(message)
	if m == nil {
		return 0, false
	}
	value, err := strconv.Atoi(strings.ReplaceAll(m[1], ",", ""))
	if err != nil || value <= 0 {
		return 0, false
	}
	if m[2] == "万円" {
		return value * 10000, true
	}
	return value, true
}

func normalizeKeyword(message string) string {
	s := uuidRe.ReplaceAllString(message, " ")
	s = numberUnitRe.ReplaceAllString(s, " ")
	s = signedRe.ReplaceAllString(s, " ")
	s = stopwordRe.ReplaceAllString(s, " ")
	s = spacesRe.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

func toAnySlice(in []string) []any {
	out := make([]any, len(in))
	for i, v := range in {
		out[i] = v
	}
	return out
}

// DeterministicDiscoverAgentResponder は tool結果から規則ベースで返答を組み立てる。
type DeterministicDiscoverAgentResponder struct{}

func NewDeterministicDiscoverAgentResponder() *DeterministicDiscoverAgentResponder {
	return &DeterministicDiscoverAgentResponder{}
}

func (DeterministicDiscoverAgentResponder) BuildReply(_ context.Context, in agentsapp.BuildDiscoverReplyInput) (agentsapp.BuildDiscoverReplyOutput, error) {
	ja := japaneseRe.MatchString(in.UserMessage)

	// 出品が0件でも、tool結果(data)があればそれを根拠に短く返す。
	if len(in.Listings) == 0 && len(in.ToolResults) > 0 {
		first := in.ToolResults[0]
		_, hasStatus := first["status"]
		data, hasData := first["data"]
		if hasStatus && hasData {
			dataJSON, _ := json.Marshal(data)
			toolName := "unknown"
			if len(in.ToolCalls) > 0 {
				toolName = in.ToolCalls[0].ToolName
			}
			if ja {
				return agentsapp.BuildDiscoverReplyOutput{
					AssistantMessage: "MCP tool " + toolName + " の結果を確認しました。" + string(dataJSON),
				}, nil
			}
			return agentsapp.BuildDiscoverReplyOutput{
				AssistantMessage: "I checked the " + toolName + " MCP tool result: " + string(dataJSON),
			}, nil
		}
	}

	if len(in.Listings) == 0 {
		if ja {
			return agentsapp.BuildDiscoverReplyOutput{
				AssistantMessage: "条件に合う出品は見つかりませんでした。条件を少し広げて試してください。",
			}, nil
		}
		return agentsapp.BuildDiscoverReplyOutput{
			AssistantMessage: "I could not find matching listings. Try broadening the request.",
		}, nil
	}

	top := in.Listings
	if len(top) > 3 {
		top = top[:3]
	}
	lines := make([]string, 0, len(top))
	for i, l := range top {
		signed := ""
		if l.Signed {
			if ja {
				signed = "・本人署名済み"
			} else {
				signed = " · signed"
			}
		}
		if ja {
			lines = append(lines, strconv.Itoa(i+1)+". "+l.Title+" - "+formatJPY(l.Price)+"円"+signed)
		} else {
			lines = append(lines, strconv.Itoa(i+1)+". "+l.Title+" - JPY "+formatThousands(l.Price)+signed)
		}
	}
	summary := strings.Join(lines, "\n")

	if ja {
		return agentsapp.BuildDiscoverReplyOutput{
			AssistantMessage: strconv.Itoa(len(in.Listings)) + "件の候補を見つけました。上位候補です。\n" + summary +
				"\n気になる商品があれば詳細を開いて比較できます。",
		}, nil
	}
	return agentsapp.BuildDiscoverReplyOutput{
		AssistantMessage: "I found " + strconv.Itoa(len(in.Listings)) + " matching listings. Top candidates:\n" + summary +
			"\nOpen a listing to inspect details or ask me to narrow the results.",
	}, nil
}

// formatThousands / formatJPY は価格を3桁区切りで表示する（toLocaleString相当）。
func formatThousands(n int32) string {
	s := strconv.FormatInt(int64(n), 10)
	neg := strings.HasPrefix(s, "-")
	if neg {
		s = s[1:]
	}
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	if neg {
		return "-" + b.String()
	}
	return b.String()
}

func formatJPY(n int32) string { return formatThousands(n) }
