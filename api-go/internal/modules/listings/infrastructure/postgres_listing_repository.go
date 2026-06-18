// Package listingsinfra は出品のrepository/画像ストアをsqlc/pgx/GCSで実装する。
package listingsinfra

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/outarc/marketplace/api-go/internal/db/pgerr"
	"github.com/outarc/marketplace/api-go/internal/db/sqlc"
	listingsdomain "github.com/outarc/marketplace/api-go/internal/modules/listings/domain"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
	"github.com/outarc/marketplace/api-go/internal/shared/pgconv"
)

// PostgresListingRepository はListingRepositoryのpostgres実装。
// constructorで受けたDBTX（pool or tx）で実行するだけで、tx境界は持たない（§10/§11）。
type PostgresListingRepository struct {
	q *sqlc.Queries
}

func NewPostgresListingRepository(db sqlc.DBTX) *PostgresListingRepository {
	return &PostgresListingRepository{q: sqlc.New(db)}
}

func (r *PostgresListingRepository) Save(ctx context.Context, l *listingsdomain.Listing) error {
	f := l.Fields()
	err := r.q.UpsertListing(ctx, sqlc.UpsertListingParams{
		ID:          l.ID(),
		SellerID:    l.SellerID(),
		AgentID:     l.AgentID(),
		Title:       f.Title,
		Description: f.Description,
		Price:       f.Price,
		Currency:    f.Currency,
		Category:    f.Category,
		Condition:   f.Condition,
		Status:      sqlc.ListingStatus(l.Status()),
		SignatureID: l.SignatureID(),
		CreatedAt:   pgconv.Timestamptz(l.CreatedAt()),
		UpdatedAt:   pgconv.Timestamptz(l.UpdatedAt()),
		PublishedAt: pgconv.TimestamptzPtr(l.PublishedAt()),
		SoldAt:      pgconv.TimestamptzPtr(l.SoldAt()),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresListingRepository) SaveImages(ctx context.Context, in listingsdomain.SaveImagesInput) error {
	if len(in.Images) == 0 {
		return nil
	}
	rows := make([]sqlc.InsertListingImagesParams, 0, len(in.Images))
	for _, img := range in.Images {
		rows = append(rows, sqlc.InsertListingImagesParams{
			ListingID: in.ListingID,
			Url:       img.URL,
			ImageHash: img.Hash,
			SortOrder: img.SortOrder,
		})
	}
	if _, err := r.q.InsertListingImages(ctx, rows); err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresListingRepository) FindByID(ctx context.Context, id uuid.UUID) (*listingsdomain.Listing, error) {
	row, err := r.q.GetListingByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		mapped := pgerr.FromPg(err)
		// 非uuid等(22P02)は「不在」と同義としてnilに畳む（usecaseがNotFound→404に集約）。
		if apperr.IsNotFound(mapped) {
			return nil, nil
		}
		return nil, mapped
	}
	images, err := r.loadImages(ctx, []uuid.UUID{id})
	if err != nil {
		return nil, err
	}
	return mapListingRow(row, images[id]), nil
}

func (r *PostgresListingRepository) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*listingsdomain.Listing, error) {
	if len(ids) == 0 {
		return []*listingsdomain.Listing{}, nil
	}
	rows, err := r.q.GetListingsByIDs(ctx, ids)
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	imageMap, err := r.loadImages(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make([]*listingsdomain.Listing, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapListingRow(row, imageMap[row.ID]))
	}
	return out, nil
}

func (r *PostgresListingRepository) Search(ctx context.Context, in listingsdomain.SearchInput) ([]*listingsdomain.Listing, error) {
	var status *sqlc.ListingStatus
	if in.Status != nil {
		s := sqlc.ListingStatus(*in.Status)
		status = &s
	}
	limit := int32(50)
	if in.Limit != nil {
		limit = *in.Limit
	}

	rows, err := r.q.SearchListings(ctx, sqlc.SearchListingsParams{
		Status:      status,
		SellerID:    in.SellerID,
		Category:    in.Category,
		Condition:   in.Condition,
		MinPrice:    in.MinPrice,
		MaxPrice:    in.MaxPrice,
		Keyword:     in.Keyword,
		ResultLimit: limit,
	})
	if err != nil {
		return nil, pgerr.FromPg(err)
	}

	ids := make([]uuid.UUID, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
	}
	imageMap, err := r.loadImages(ctx, ids)
	if err != nil {
		return nil, err
	}

	out := make([]*listingsdomain.Listing, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapListingRow(row, imageMap[row.ID]))
	}
	return out, nil
}

// ClaimForPurchase は条件付きUPDATEで原子的にSOLDへ遷移する。claim行が無ければ(nil,nil)。
func (r *PostgresListingRepository) ClaimForPurchase(ctx context.Context, in listingsdomain.ClaimForPurchaseInput) (*listingsdomain.Listing, error) {
	row, err := r.q.ClaimListingForPurchase(ctx, sqlc.ClaimListingForPurchaseParams{
		SoldAt:    pgconv.Timestamptz(in.SoldAt),
		ListingID: in.ListingID,
		BuyerID:   in.BuyerID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, pgerr.FromPg(err)
	}
	// claim直後の画像までは購入処理に不要なので空でrehydrateする。
	return mapListingRow(row, nil), nil
}

// loadImages は listing_images を listingId ごとに sort_order 順でロードする。
func (r *PostgresListingRepository) loadImages(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]listingsdomain.ListingImageRef, error) {
	out := make(map[uuid.UUID][]listingsdomain.ListingImageRef)
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := r.q.ListImagesByListingIDs(ctx, ids)
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	for _, row := range rows {
		out[row.ListingID] = append(out[row.ListingID], listingsdomain.ListingImageRef{
			URL:       row.Url,
			SortOrder: row.SortOrder,
		})
	}
	return out, nil
}

func mapListingRow(row sqlc.Listing, images []listingsdomain.ListingImageRef) *listingsdomain.Listing {
	return listingsdomain.Rehydrate(listingsdomain.RehydrateInput{
		ID:       row.ID,
		SellerID: row.SellerID,
		AgentID:  row.AgentID,
		Fields: listingsdomain.ListingFields{
			Title:       row.Title,
			Description: row.Description,
			Price:       row.Price,
			Currency:    row.Currency,
			Category:    row.Category,
			Condition:   row.Condition,
		},
		Status:      listingsdomain.ListingStatus(row.Status),
		SignatureID: row.SignatureID,
		Images:      images,
		CreatedAt:   pgconv.Time(row.CreatedAt),
		UpdatedAt:   pgconv.Time(row.UpdatedAt),
		PublishedAt: pgconv.TimePtr(row.PublishedAt),
		SoldAt:      pgconv.TimePtr(row.SoldAt),
	})
}
