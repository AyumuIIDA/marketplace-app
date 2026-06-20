package workflows

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	listingsdomain "marketplace/api-go/internal/modules/listings/domain"
	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
)

// ListingIndexer は出品ライフサイクルをベクトルDBへ投影する post-commit projection。
// DBが真実の源泉、ベクトルは二次read-model。投影は常にコミット後・tx外で行い、
// 失敗はログのみで握り潰す（出品操作は止めない）。整合の最終修復はオフラインの
// backfill-embeddings.py（同じ listingID 冪等 upsert）が担う。
type ListingIndexer struct {
	listings listingsdomain.ListingRepository
	vector   recommendationapp.VectorIndex
}

// NewListingIndexer は読取用の listing repository とベクトルport から projection を構築する。
func NewListingIndexer(r listingsdomain.ListingRepository, v recommendationapp.VectorIndex) *ListingIndexer {
	return &ListingIndexer{listings: r, vector: v}
}

// Reindex は現在のDB状態を読み、検索対象(PUBLISHED等)なら upsert、そうでなければ remove する。
// publish / update の post-commit から呼ぶ。nil receiver / nil vector は no-op（縮退・テストで安全）。
func (ix *ListingIndexer) Reindex(ctx context.Context, listingID uuid.UUID) {
	if ix == nil || ix.vector == nil {
		return
	}
	listing, err := ix.listings.FindByID(ctx, listingID)
	if err != nil || listing == nil {
		slog.Warn("listing index: load failed",
			slog.String("listingId", listingID.String()), slog.Any("err", err))
		return
	}
	// 公開されていない（下書き/非表示/売却済み）出品は検索対象から外す。
	if !listingsdomain.IsSearchable(listing) {
		ix.Remove(ctx, listingID)
		return
	}
	f := listing.Fields()
	in := recommendationapp.IndexInput{
		ListingID:   listing.ID().String(),
		ImageURL:    primaryImageURL(listing),
		Title:       f.Title,
		Description: f.Description,
		Category:    f.Category,
		Price:       f.Price,
		Status:      string(listing.Status()),
		SellerID:    listing.SellerID().String(),
	}
	if err := ix.vector.Index(ctx, in); err != nil {
		slog.Warn("listing index: upsert failed (reconcile via backfill)",
			slog.String("listingId", listingID.String()), slog.Any("err", err))
	}
}

// Remove はベクトルDBから出品を削除する。hide / purchase(sold) の post-commit から呼ぶ。
func (ix *ListingIndexer) Remove(ctx context.Context, listingID uuid.UUID) {
	if ix == nil || ix.vector == nil {
		return
	}
	if err := ix.vector.Delete(ctx, listingID.String()); err != nil {
		slog.Warn("listing index: delete failed",
			slog.String("listingId", listingID.String()), slog.Any("err", err))
	}
}

// primaryImageURL は SortOrder 最小の画像URL（無ければ空文字）。
// recommendation-py が CLIP 画像埋め込みに使う代表画像。
func primaryImageURL(l *listingsdomain.Listing) string {
	best, bestOrder := "", int32(1<<31-1)
	for _, im := range l.Images() {
		if im.SortOrder <= bestOrder {
			best, bestOrder = im.URL, im.SortOrder
		}
	}
	return best
}
