package workflows

import (
	"context"

	listingsapp "marketplace/api-go/internal/modules/listings/application"
)

// PublishListingWorkflow は署名なし公開(usecase)に、コミット後のベクトル投影を足した workflow。
// DB公開 → ベクトルDB upsert の順で実行する。投影は best-effort（ListingIndexer 内で握り潰す）。
type PublishListingWorkflow struct {
	publish *listingsapp.PublishListingUseCase
	indexer *ListingIndexer
}

// NewPublishListingWorkflow は未署名公開usecaseと projection を束ねる。
func NewPublishListingWorkflow(p *listingsapp.PublishListingUseCase, ix *ListingIndexer) *PublishListingWorkflow {
	return &PublishListingWorkflow{publish: p, indexer: ix}
}

func (w *PublishListingWorkflow) Execute(ctx context.Context, in listingsapp.PublishListingInput) (listingsapp.PublishListingResult, error) {
	out, err := w.publish.Execute(ctx, in)
	if err != nil {
		return out, err
	}
	w.indexer.Reindex(ctx, in.ListingID) // post-commit projection
	return out, nil
}

// HideListingWorkflow は hide(usecase)に、コミット後のベクトル削除を足した workflow。
// DB非表示化 → ベクトルDB から除外、の順で実行する。
type HideListingWorkflow struct {
	hide    *listingsapp.HideListingUseCase
	indexer *ListingIndexer
}

// NewHideListingWorkflow は hide usecaseと projection を束ねる。
func NewHideListingWorkflow(h *listingsapp.HideListingUseCase, ix *ListingIndexer) *HideListingWorkflow {
	return &HideListingWorkflow{hide: h, indexer: ix}
}

func (w *HideListingWorkflow) Execute(ctx context.Context, in listingsapp.HideListingInput) (listingsapp.HideListingResult, error) {
	out, err := w.hide.Execute(ctx, in)
	if err != nil {
		return out, err
	}
	w.indexer.Remove(ctx, in.ListingID) // post-commit projection
	return out, nil
}
