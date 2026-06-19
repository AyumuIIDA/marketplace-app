package aiinfra

import (
	"context"
	"log/slog"

	aiapp "marketplace/api-go/internal/modules/aiassistance/application"
)

// FallbackAiAssistant は primary(LLM) が失敗したら fallback(決定論) に縮退する decorator。
// discover agent と同じ思想: AI不調でも出品支援などのフローを止めない。
// 失敗は Warn でログし、生の原因(Vertex/SDKエラー等)を残して観測可能にする。
type FallbackAiAssistant struct {
	primary  aiapp.AiAssistant
	fallback aiapp.AiAssistant
}

func NewFallbackAiAssistant(primary, fallback aiapp.AiAssistant) *FallbackAiAssistant {
	return &FallbackAiAssistant{primary: primary, fallback: fallback}
}

var _ aiapp.AiAssistant = (*FallbackAiAssistant)(nil)

func (f *FallbackAiAssistant) logFallback(ctx context.Context, op string, err error) {
	slog.WarnContext(ctx, "ai assistant primary failed; using deterministic fallback",
		slog.String("op", op),
		slog.String("error", err.Error()),
	)
}

func (f *FallbackAiAssistant) SuggestListingFields(ctx context.Context, in aiapp.SuggestListingFieldsInput) (aiapp.SuggestListingFieldsResult, error) {
	out, err := f.primary.SuggestListingFields(ctx, in)
	if err != nil {
		f.logFallback(ctx, "SuggestListingFields", err)
		return f.fallback.SuggestListingFields(ctx, in)
	}
	return out, nil
}

func (f *FallbackAiAssistant) SuggestPrice(ctx context.Context, in aiapp.SuggestPriceInput) (aiapp.SuggestPriceResult, error) {
	out, err := f.primary.SuggestPrice(ctx, in)
	if err != nil {
		f.logFallback(ctx, "SuggestPrice", err)
		return f.fallback.SuggestPrice(ctx, in)
	}
	return out, nil
}

func (f *FallbackAiAssistant) SuggestReview(ctx context.Context, in aiapp.SuggestReviewInput) (aiapp.SuggestReviewResult, error) {
	out, err := f.primary.SuggestReview(ctx, in)
	if err != nil {
		f.logFallback(ctx, "SuggestReview", err)
		return f.fallback.SuggestReview(ctx, in)
	}
	return out, nil
}

func (f *FallbackAiAssistant) SuggestMessage(ctx context.Context, in aiapp.SuggestMessageInput) (aiapp.SuggestMessageResult, error) {
	out, err := f.primary.SuggestMessage(ctx, in)
	if err != nil {
		f.logFallback(ctx, "SuggestMessage", err)
		return f.fallback.SuggestMessage(ctx, in)
	}
	return out, nil
}

func (f *FallbackAiAssistant) CompareListings(ctx context.Context, in aiapp.CompareListingsInput) (aiapp.CompareListingsResult, error) {
	out, err := f.primary.CompareListings(ctx, in)
	if err != nil {
		f.logFallback(ctx, "CompareListings", err)
		return f.fallback.CompareListings(ctx, in)
	}
	return out, nil
}
