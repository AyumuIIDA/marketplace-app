// Package aiinfra はAI支援のadapter（決定論fake / Gemini）と画像取得を実装する。
package aiinfra

import (
	"context"
	"fmt"
	"strings"

	aiapp "marketplace/api-go/internal/modules/aiassistance/application"
)

// DeterministicAiAssistant はLLM未接続時の決定論fake（既定）。
// 入力から規則的に生成し、テスト可能性とデモ安定性を確保する。
type DeterministicAiAssistant struct{}

func NewDeterministicAiAssistant() DeterministicAiAssistant { return DeterministicAiAssistant{} }

var basePriceByCategory = map[string]int32{
	"fashion_shoes": 8000,
	"fashion":       6000,
	"electronics":   15000,
	"books":         1000,
	"general":       5000,
}

var conditionFactor = map[string]float64{
	"new": 1.2, "good": 1.0, "fair": 0.8, "poor": 0.6,
}

func (DeterministicAiAssistant) SuggestListingFields(_ context.Context, in aiapp.SuggestListingFieldsInput) (aiapp.SuggestListingFieldsResult, error) {
	hint := ""
	if in.UserHint != nil {
		hint = strings.TrimSpace(*in.UserHint)
	}
	title := "中古品"
	description := "出品者からの説明はまだありません。"
	if hint != "" {
		title = sliceRunes(hint, 40)
		description = fmt.Sprintf("%s。状態は画像と説明から推定しています。", hint)
	}
	// 既存カテゴリがあれば先頭に寄せる（決定論でも既存集合へ整合）。
	category := "general"
	if len(in.AllowedCategories) > 0 {
		category = in.AllowedCategories[0]
	}
	return aiapp.SuggestListingFieldsResult{
		Title:           title,
		Description:     description,
		Category:        category,
		Condition:       "good",
		ConfidenceNotes: []string{"状態とカテゴリは入力テキストから推定した暫定値です。"},
	}, nil
}

func (DeterministicAiAssistant) SuggestPrice(_ context.Context, in aiapp.SuggestPriceInput) (aiapp.SuggestPriceResult, error) {
	base, ok := basePriceByCategory[in.Category]
	if !ok {
		base = basePriceByCategory["general"]
	}
	cf := conditionFactor[in.Condition]
	if cf == 0 {
		cf = 1.0
	}
	sf := 1.0
	if in.PriceStrategy != nil {
		switch *in.PriceStrategy {
		case "slightly_below_market":
			sf = 0.9
		case "premium":
			sf = 1.1
		}
	}
	suggested := int32(float64(base)*cf*sf/100) * 100
	return aiapp.SuggestPriceResult{
		SuggestedPrice: suggested,
		Currency:       "JPY",
		Reason:         fmt.Sprintf("%sの基準価格%d円に状態と価格戦略を反映しました。", in.Category, base),
	}, nil
}

func (DeterministicAiAssistant) SuggestReview(_ context.Context, in aiapp.SuggestReviewInput) (aiapp.SuggestReviewResult, error) {
	rating := int32(5)
	if in.RatingHint != nil {
		rating = *in.RatingHint
	}
	comment := "スムーズな取引で助かりました。"
	if in.Tone != nil && *in.Tone == "polite" {
		comment = "迅速かつ丁寧な取引をありがとうございました。"
	}
	return aiapp.SuggestReviewResult{Rating: rating, Comment: comment}, nil
}

func (DeterministicAiAssistant) SuggestMessage(_ context.Context, in aiapp.SuggestMessageInput) (aiapp.SuggestMessageResult, error) {
	intent := ""
	if in.Intent != nil {
		intent = strings.TrimSpace(*in.Intent)
	}
	body := "取引について確認したいことがあります。"
	if intent != "" {
		body = intent
	}
	msg := fmt.Sprintf("%sよろしくお願いします。", body)
	if in.Tone != nil && *in.Tone == "polite" {
		msg = fmt.Sprintf("お世話になっております。%sご確認のほどよろしくお願いいたします。", body)
	}
	return aiapp.SuggestMessageResult{Message: msg}, nil
}

func (DeterministicAiAssistant) CompareListings(_ context.Context, in aiapp.CompareListingsInput) (aiapp.CompareListingsResult, error) {
	if len(in.Listings) == 0 {
		return aiapp.CompareListingsResult{Summary: "比較対象の出品がありません。", Items: []aiapp.CompareListingsItem{}}, nil
	}
	cheapest := in.Listings[0]
	for _, l := range in.Listings {
		if l.Price < cheapest.Price {
			cheapest = l
		}
	}
	items := make([]aiapp.CompareListingsItem, 0, len(in.Listings))
	for _, l := range in.Listings {
		pros := []string{"選択肢のひとつ", fmt.Sprintf("状態: %s", l.Condition)}
		cons := []string{fmt.Sprintf("最安より高い(%d%s)", l.Price, l.Currency)}
		if l.ListingID == cheapest.ListingID {
			pros[0] = "価格が最も安い"
			cons = []string{}
		}
		items = append(items, aiapp.CompareListingsItem{ListingID: l.ListingID, Pros: pros, Cons: cons})
	}
	return aiapp.CompareListingsResult{
		Summary: fmt.Sprintf("%d件を比較しました。最安は「%s」(%d%s)です。", len(in.Listings), cheapest.Title, cheapest.Price, cheapest.Currency),
		Items:   items,
	}, nil
}

func sliceRunes(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}

var _ aiapp.AiAssistant = DeterministicAiAssistant{}
