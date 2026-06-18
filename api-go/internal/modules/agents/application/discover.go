package agentsapp

import "context"

// discover agent の plan(tool選択)/reply(返答生成) の Application Port。
// 実装は infrastructure（deterministic / gemini / openai）。
// peer module(listings等)へ依存しないよう、port は中立DTOのみで会話する。

// DiscoverMessage は会話履歴の1発話（role + content）。
type DiscoverMessage struct {
	Role    string `json:"role"` // "user" | "assistant"
	Content string `json:"content"`
}

// DiscoverToolPlan は planner が選んだ単一MCP toolと引数。
type DiscoverToolPlan struct {
	ToolName  string         `json:"toolName"`
	Arguments map[string]any `json:"arguments"`
}

// PlanDiscoverToolInput は planner への入力（最新発話 + 直近文脈）。
type PlanDiscoverToolInput struct {
	UserMessage string
	Messages    []DiscoverMessage
}

// DiscoverAgentPlanner は次に呼ぶMCP toolを1つ選ぶ。
type DiscoverAgentPlanner interface {
	PlanTool(ctx context.Context, in PlanDiscoverToolInput) (DiscoverToolPlan, error)
}

// DiscoverListing は responder が参照する出品要約（listings module非依存の中立表現）。
type DiscoverListing struct {
	ListingID string `json:"listingId"`
	Title     string `json:"title"`
	Price     int32  `json:"price"`
	Currency  string `json:"currency"`
	Category  string `json:"category"`
	Condition string `json:"condition"`
	Signed    bool   `json:"signed"`
	Status    string `json:"status"`
}

// DiscoverToolCallSummary は実行済みtool呼び出しの要約（responderの根拠）。
type DiscoverToolCallSummary struct {
	ToolName  string         `json:"toolName"`
	Arguments map[string]any `json:"arguments"`
	Status    string         `json:"status"`
}

// BuildDiscoverReplyInput は responder への入力。
type BuildDiscoverReplyInput struct {
	UserMessage string
	Messages    []DiscoverMessage
	Listings    []DiscoverListing
	ToolCalls   []DiscoverToolCallSummary
	ToolResults []map[string]any
}

// BuildDiscoverReplyOutput は responder の出力（最終アシスタント返答）。
type BuildDiscoverReplyOutput struct {
	AssistantMessage string
}

// DiscoverAgentResponder は tool結果を読んで自然な返答を生成する。
type DiscoverAgentResponder interface {
	BuildReply(ctx context.Context, in BuildDiscoverReplyInput) (BuildDiscoverReplyOutput, error)
}
