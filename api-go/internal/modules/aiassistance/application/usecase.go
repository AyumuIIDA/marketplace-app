package aiapp

import (
	"context"

	"marketplace/api-go/internal/shared/apperr"
)

// SuggestListingFieldsUseCase は商品画像とヒントから出品項目を提案する。
type SuggestListingFieldsUseCase struct {
	assistant AiAssistant
}

func NewSuggestListingFieldsUseCase(a AiAssistant) *SuggestListingFieldsUseCase {
	return &SuggestListingFieldsUseCase{assistant: a}
}

func (uc *SuggestListingFieldsUseCase) Execute(ctx context.Context, in SuggestListingFieldsInput) (SuggestListingFieldsResult, error) {
	if len(in.ImageURLs) == 0 {
		return SuggestListingFieldsResult{}, apperr.Validation("At least one product image is required.",
			apperr.FieldError{Field: "imageUrls", Reason: "required"})
	}
	return uc.assistant.SuggestListingFields(ctx, in)
}
