package aiapp

import (
	"context"

	"marketplace/api-go/internal/shared/apperr"
)

// SuggestListingFieldsUseCase は商品画像とヒントから出品項目を提案する。
type SuggestListingFieldsUseCase struct {
	assistant  AiAssistant
	categories CategoryReader
}

func NewSuggestListingFieldsUseCase(a AiAssistant) *SuggestListingFieldsUseCase {
	return &SuggestListingFieldsUseCase{assistant: a}
}

// WithCategories は既存カテゴリの reader を注入する（任意。未注入なら制約なし）。
func (uc *SuggestListingFieldsUseCase) WithCategories(r CategoryReader) *SuggestListingFieldsUseCase {
	uc.categories = r
	return uc
}

func (uc *SuggestListingFieldsUseCase) Execute(ctx context.Context, in SuggestListingFieldsInput) (SuggestListingFieldsResult, error) {
	if len(in.ImageURLs) == 0 {
		return SuggestListingFieldsResult{}, apperr.Validation("At least one product image is required.",
			apperr.FieldError{Field: "imageUrls", Reason: "required"})
	}
	// 既存のユニークなカテゴリを AI に制約として渡す（提案を既存集合へ寄せる）。
	// 取得失敗は制約なしで続行（致命にしない）。
	if uc.categories != nil {
		if cats, err := uc.categories.Categories(ctx); err == nil && len(cats) > 0 {
			in.AllowedCategories = cats
		}
	}
	return uc.assistant.SuggestListingFields(ctx, in)
}
