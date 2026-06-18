package aiinfra

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"google.golang.org/genai"

	aiapp "github.com/outarc/marketplace/api-go/internal/modules/aiassistance/application"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
)

// GeminiAiAssistant はVertex AI(Gemini)で構造化JSONを生成するadapter。
// 認証はADC（Cloud Runサービスアカウント）。出品支援は商品画像を同梱したマルチモーダル入力。
type GeminiAiAssistant struct {
	client            *genai.Client
	model             string
	httpClient        *http.Client
	imageFetchBaseURL string
}

func NewGeminiAiAssistant(ctx context.Context, project, location, model, imageFetchBaseURL string) (*GeminiAiAssistant, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		Backend:  genai.BackendVertexAI,
		Project:  project,
		Location: location,
	})
	if err != nil {
		return nil, apperr.Infrastructure("failed to create Gemini client", err)
	}
	return &GeminiAiAssistant{
		client:            client,
		model:             model,
		httpClient:        &http.Client{Timeout: 30 * time.Second},
		imageFetchBaseURL: imageFetchBaseURL,
	}, nil
}

func strFromPtr(p *string, fallback string) string {
	if p == nil || strings.TrimSpace(*p) == "" {
		return fallback
	}
	return *p
}

func (g *GeminiAiAssistant) SuggestListingFields(ctx context.Context, in aiapp.SuggestListingFieldsInput) (aiapp.SuggestListingFieldsResult, error) {
	images, err := fetchInlineImages(ctx, g.httpClient, g.imageFetchBaseURL, in.ImageURLs)
	if err != nil {
		return aiapp.SuggestListingFieldsResult{}, err
	}
	prompt := strings.Join([]string{
		"あなたはフリマアプリの出品支援AIです。以下の情報から出品項目を日本語で提案してください。",
		"ヒント: " + strFromPtr(in.UserHint, "(なし)"),
		"添付された商品画像を読み取り、見た目・状態・カテゴリを反映してください。",
		"confidenceNotesには推定の根拠や不確実な点を記載してください。",
	}, "\n")
	schema := objectSchema(map[string]*genai.Schema{
		"title":           {Type: genai.TypeString},
		"description":     {Type: genai.TypeString},
		"category":        {Type: genai.TypeString},
		"condition":       {Type: genai.TypeString},
		"confidenceNotes": {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeString}},
	}, "title", "description", "category", "condition", "confidenceNotes")

	var out aiapp.SuggestListingFieldsResult
	if err := g.generateStructured(ctx, schema, prompt, images, &out); err != nil {
		return aiapp.SuggestListingFieldsResult{}, err
	}
	return out, nil
}

func (g *GeminiAiAssistant) SuggestPrice(ctx context.Context, in aiapp.SuggestPriceInput) (aiapp.SuggestPriceResult, error) {
	prompt := strings.Join([]string{
		"あなたはフリマアプリの価格提案AIです。以下の商品の希望出品価格を理由付きで提案してください。",
		"タイトル: " + in.Title,
		"カテゴリ: " + in.Category,
		"状態: " + in.Condition,
		"価格戦略: " + strFromPtr(in.PriceStrategy, "標準"),
		`suggestedPriceは日本円(JPY)の整数、currencyは"JPY"としてください。`,
	}, "\n")
	schema := objectSchema(map[string]*genai.Schema{
		"suggestedPrice": {Type: genai.TypeInteger},
		"currency":       {Type: genai.TypeString},
		"reason":         {Type: genai.TypeString},
	}, "suggestedPrice", "currency", "reason")
	var out aiapp.SuggestPriceResult
	if err := g.generateStructured(ctx, schema, prompt, nil, &out); err != nil {
		return aiapp.SuggestPriceResult{}, err
	}
	return out, nil
}

func (g *GeminiAiAssistant) SuggestReview(ctx context.Context, in aiapp.SuggestReviewInput) (aiapp.SuggestReviewResult, error) {
	ratingHint := "(指定なし)"
	if in.RatingHint != nil {
		ratingHint = fmt.Sprintf("%d", *in.RatingHint)
	}
	prompt := strings.Join([]string{
		"あなたはフリマアプリの評価文ドラフトAIです。取引の評価文を日本語で提案してください。",
		"注文ID: " + in.OrderID,
		"評価の目安: " + ratingHint,
		"トーン: " + strFromPtr(in.Tone, "中立"),
		"ratingは1〜5の整数としてください。",
	}, "\n")
	schema := objectSchema(map[string]*genai.Schema{
		"rating":  {Type: genai.TypeInteger},
		"comment": {Type: genai.TypeString},
	}, "rating", "comment")
	var out aiapp.SuggestReviewResult
	if err := g.generateStructured(ctx, schema, prompt, nil, &out); err != nil {
		return aiapp.SuggestReviewResult{}, err
	}
	return out, nil
}

func (g *GeminiAiAssistant) SuggestMessage(ctx context.Context, in aiapp.SuggestMessageInput) (aiapp.SuggestMessageResult, error) {
	prompt := strings.Join([]string{
		"あなたはフリマアプリの取引メッセージ草案AIです。取引相手へ送るメッセージを日本語で提案してください。",
		"注文ID: " + in.OrderID,
		"意図: " + strFromPtr(in.Intent, "(なし)"),
		"トーン: " + strFromPtr(in.Tone, "丁寧"),
		"messageは相手に送れる完成した本文としてください。",
	}, "\n")
	schema := objectSchema(map[string]*genai.Schema{
		"message": {Type: genai.TypeString},
	}, "message")
	var out aiapp.SuggestMessageResult
	if err := g.generateStructured(ctx, schema, prompt, nil, &out); err != nil {
		return aiapp.SuggestMessageResult{}, err
	}
	return out, nil
}

func (g *GeminiAiAssistant) CompareListings(ctx context.Context, in aiapp.CompareListingsInput) (aiapp.CompareListingsResult, error) {
	listingsJSON, _ := json.Marshal(in.Listings)
	prompt := strings.Join([]string{
		"あなたはフリマアプリの商品比較AIです。以下の出品を比較し、購入判断を日本語で支援してください。",
		"各出品についてpros(長所)とcons(短所)を挙げ、全体のsummaryをまとめてください。",
		"対象出品(JSON):",
		string(listingsJSON),
		"itemsのlistingIdは入力のlistingIdと必ず一致させてください。",
	}, "\n")
	schema := objectSchema(map[string]*genai.Schema{
		"summary": {Type: genai.TypeString},
		"items": {Type: genai.TypeArray, Items: objectSchema(map[string]*genai.Schema{
			"listingId": {Type: genai.TypeString},
			"pros":      {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeString}},
			"cons":      {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeString}},
		}, "listingId", "pros", "cons")},
	}, "summary", "items")
	var out aiapp.CompareListingsResult
	if err := g.generateStructured(ctx, schema, prompt, nil, &out); err != nil {
		return aiapp.CompareListingsResult{}, err
	}
	return out, nil
}

func objectSchema(props map[string]*genai.Schema, required ...string) *genai.Schema {
	return &genai.Schema{Type: genai.TypeObject, Properties: props, Required: required}
}

// generateStructured はprompt(+画像)からschema準拠のJSONを生成し dst へunmarshalする。
func (g *GeminiAiAssistant) generateStructured(ctx context.Context, schema *genai.Schema, prompt string, images []inlineImage, dst any) error {
	parts := []*genai.Part{genai.NewPartFromText(prompt)}
	for _, img := range images {
		data, err := base64.StdEncoding.DecodeString(img.Base64)
		if err != nil {
			return apperr.Infrastructure("invalid inline image", err)
		}
		parts = append(parts, genai.NewPartFromBytes(data, img.MimeType))
	}
	contents := []*genai.Content{genai.NewContentFromParts(parts, genai.RoleUser)}

	result, err := g.client.Models.GenerateContent(ctx, g.model, contents, &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseSchema:   schema,
	})
	if err != nil {
		return aiAssistFailed("Gemini assistant request failed.")
	}
	text := strings.TrimSpace(result.Text())
	if text == "" {
		return aiAssistFailed("Gemini assistant returned no text output.")
	}
	// markdownフェンスや前後文を含む応答に頑健にするため、JSON本体を抽出してからparseする。
	if err := json.Unmarshal([]byte(extractJSONText(text)), dst); err != nil {
		return aiAssistFailed("Gemini assistant returned invalid structured output.")
	}
	return nil
}

// fencedJSONRe は ```json ... ``` / ``` ... ``` フェンスを検出する（大文字小文字無視・複数行）。
var fencedJSONRe = regexp.MustCompile("(?is)^```(?:json)?\\s*(.*?)\\s*```$")

// extractJSONText はLLM応答テキストからJSON本体を取り出す。
// 1) markdownフェンスがあれば内側、2) なければ最初の { から最後の } まで、3) それも無ければそのまま。
func extractJSONText(text string) string {
	trimmed := strings.TrimSpace(text)
	if m := fencedJSONRe.FindStringSubmatch(trimmed); m != nil {
		return strings.TrimSpace(m[1])
	}
	first := strings.Index(trimmed, "{")
	last := strings.LastIndex(trimmed, "}")
	if first != -1 && last > first {
		return trimmed[first : last+1]
	}
	return trimmed
}

func aiAssistFailed(message string) error {
	return &apperr.AppError{Kind: apperr.KindInternal, Code: "AI_ASSIST_FAILED", Message: message}
}

var _ aiapp.AiAssistant = (*GeminiAiAssistant)(nil)
