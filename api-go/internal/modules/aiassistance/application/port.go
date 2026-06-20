// Package aiapp はAIエージェント支援のUseCaseとoutbound portを定義する。
// 実装はLLM adapter（Gemini）/ 決定論fake のいずれか（AiAssistant portは不変）。
package aiapp

import "context"

// SuggestListingFieldsInput は出品項目提案の入力。
type SuggestListingFieldsInput struct {
	UserHint  *string
	ImageURLs []string // API到達可能URL（マルチモーダル入力にする）
	// AllowedCategories は既存出品のユニークなカテゴリ。非空なら AI は category をこのいずれかへ寄せる
	// （prompt＋ResponseSchema の enum で制約）。usecase が注入する。
	AllowedCategories []string
}

// CategoryReader は既存出品のユニークなカテゴリ集合を返す read port。
// listings と peer 分離のため、実装(adapter)は composition root が注入する。
type CategoryReader interface {
	Categories(ctx context.Context) ([]string, error)
}

type SuggestListingFieldsResult struct {
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	Category        string   `json:"category"`
	Condition       string   `json:"condition"`
	ConfidenceNotes []string `json:"confidenceNotes"`
}

type SuggestPriceInput struct {
	Title         string
	Category      string
	Condition     string
	PriceStrategy *string
}

type SuggestPriceResult struct {
	SuggestedPrice int32  `json:"suggestedPrice"`
	Currency       string `json:"currency"`
	Reason         string `json:"reason"`
}

type SuggestReviewInput struct {
	OrderID    string
	RatingHint *int32
	Tone       *string
}

type SuggestReviewResult struct {
	Rating  int32  `json:"rating"`
	Comment string `json:"comment"`
}

type SuggestMessageInput struct {
	OrderID string
	Intent  *string
	Tone    *string
}

type SuggestMessageResult struct {
	Message string `json:"message"`
}

// ComparableListing は比較対象の出品要約（取得はworkflow側）。
type ComparableListing struct {
	ListingID   string `json:"listingId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Price       int32  `json:"price"`
	Currency    string `json:"currency"`
	Condition   string `json:"condition"`
	Category    string `json:"category"`
}

type CompareListingsInput struct {
	Listings []ComparableListing
}

type CompareListingsItem struct {
	ListingID string   `json:"listingId"`
	Pros      []string `json:"pros"`
	Cons      []string `json:"cons"`
}

type CompareListingsResult struct {
	Summary string                `json:"summary"`
	Items   []CompareListingsItem `json:"items"`
}

// AiAssistant はAI支援のoutbound port。
type AiAssistant interface {
	SuggestListingFields(ctx context.Context, in SuggestListingFieldsInput) (SuggestListingFieldsResult, error)
	SuggestPrice(ctx context.Context, in SuggestPriceInput) (SuggestPriceResult, error)
	SuggestReview(ctx context.Context, in SuggestReviewInput) (SuggestReviewResult, error)
	SuggestMessage(ctx context.Context, in SuggestMessageInput) (SuggestMessageResult, error)
	CompareListings(ctx context.Context, in CompareListingsInput) (CompareListingsResult, error)
}
