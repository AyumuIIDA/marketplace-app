package agentsinfra

import (
	"encoding/json"
	"strings"

	agentsapp "github.com/outarc/marketplace/api-go/internal/modules/agents/application"
)

// discover planner/responder の LLMプロンプト。gemini/openai で共有する（TS版と同一方針）。

func lastMessages(messages []agentsapp.DiscoverMessage, n int) []agentsapp.DiscoverMessage {
	if len(messages) > n {
		return messages[len(messages)-n:]
	}
	return messages
}

func jsonString(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "null"
	}
	return string(b)
}

func buildPlannerPrompt(in agentsapp.PlanDiscoverToolInput) string {
	return strings.Join([]string{
		"You are selecting exactly one MCP tool for a marketplace shopping assistant.",
		"Return only JSON with toolName and arguments.",
		"Allowed tools:",
		"- search_listings: find listings. args: keyword?, category?, minPrice?, maxPrice?, condition?, mine?, limit?",
		"- get_listing: inspect one listing. args: listingId",
		"- compare_listings: compare 2-5 known listing IDs. args: listingIds",
		"- suggest_price: suggest a listing price. args: title, category, condition, priceStrategy?",
		"Choose search_listings for ordinary shopping/search requests.",
		"Choose get_listing only when a specific listing ID is present and details are requested.",
		"Choose compare_listings only when at least two listing IDs are present and comparison is requested.",
		"Choose suggest_price only when the user asks what price to set for an item.",
		"Conversation history JSON:",
		jsonString(lastMessages(in.Messages, 8)),
		"Latest user message:",
		in.UserMessage,
	}, "\n")
}

// discoverResultListing は responder へ渡す検索結果の軽量表現（signedはbool）。
type discoverResultListing struct {
	ListingID string `json:"listingId"`
	Title     string `json:"title"`
	Price     int32  `json:"price"`
	Currency  string `json:"currency"`
	Category  string `json:"category"`
	Condition string `json:"condition"`
	Signed    bool   `json:"signed"`
	Status    string `json:"status"`
}

func resultListings(in agentsapp.BuildDiscoverReplyInput) []discoverResultListing {
	listings := in.Listings
	if len(listings) > 8 {
		listings = listings[:8]
	}
	out := make([]discoverResultListing, 0, len(listings))
	for _, l := range listings {
		out = append(out, discoverResultListing{
			ListingID: l.ListingID,
			Title:     l.Title,
			Price:     l.Price,
			Currency:  l.Currency,
			Category:  l.Category,
			Condition: l.Condition,
			Signed:    l.Signed,
			Status:    l.Status,
		})
	}
	return out
}

func buildResponderPrompt(in agentsapp.BuildDiscoverReplyInput) string {
	return strings.Join([]string{
		"You are a marketplace shopping assistant.",
		"Continue reasoning after the MCP tool call by reading the search_listings result.",
		"Do not invent facts that are not present in the search results.",
		"If there are candidates, compare them briefly using title, price, condition, category, and signed status.",
		"If there are no candidates, suggest how to broaden the request.",
		"Respond in the user's language.",
		"Conversation history JSON:",
		jsonString(lastMessages(in.Messages, 8)),
		"Latest user message:",
		in.UserMessage,
		"MCP tool calls JSON:",
		jsonString(in.ToolCalls),
		"MCP tool results JSON:",
		jsonString(in.ToolResults),
		"Search results JSON:",
		jsonString(resultListings(in)),
	}, "\n")
}
