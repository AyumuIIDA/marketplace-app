// Package ordersinfra は注文のrepositoryをsqlc/pgxで実装する。
package ordersinfra

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"marketplace/api-go/internal/db/pgerr"
	"marketplace/api-go/internal/db/sqlc"
	ordersdomain "marketplace/api-go/internal/modules/orders/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/pgconv"
)

// PostgresOrderRepository はOrderRepositoryのpostgres実装。
// constructorで受けたDBTX（pool or tx）で実行する（§10/§11）。
type PostgresOrderRepository struct {
	q *sqlc.Queries
}

func NewPostgresOrderRepository(db sqlc.DBTX) *PostgresOrderRepository {
	return &PostgresOrderRepository{q: sqlc.New(db)}
}

func (r *PostgresOrderRepository) Save(ctx context.Context, o *ordersdomain.Order) error {
	err := r.q.UpsertOrder(ctx, sqlc.UpsertOrderParams{
		ID:              o.ID(),
		ListingID:       o.ListingID(),
		BuyerID:         o.BuyerID(),
		SellerID:        o.SellerID(),
		Status:          sqlc.OrderStatus(o.Status()),
		Price:           o.Price(),
		Currency:        o.Currency(),
		ListingTitle:    o.ListingTitle(),
		ListingImageUrl: o.ListingImageURL(),
		CreatedAt:       pgconv.Timestamptz(o.CreatedAt()),
		PaidAt:          pgconv.TimestamptzPtr(o.PaidAt()),
		ShippedAt:       pgconv.TimestamptzPtr(o.ShippedAt()),
		ReceivedAt:      pgconv.TimestamptzPtr(o.ReceivedAt()),
		CompletedAt:     pgconv.TimestamptzPtr(o.CompletedAt()),
		CanceledAt:      pgconv.TimestamptzPtr(o.CanceledAt()),
	})
	if err != nil {
		// listing_id 一意制約違反 = 同一listingに既に注文あり → 409。
		var pg *pgconn.PgError
		if errors.As(err, &pg) && pg.Code == "23505" && pg.ConstraintName == "orders_listing_id_uidx" {
			return apperr.Conflict("LISTING_ALREADY_ORDERED", "This listing already has an order.")
		}
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresOrderRepository) FindByID(ctx context.Context, id uuid.UUID) (*ordersdomain.Order, error) {
	row, err := r.q.GetOrderByID(ctx, id)
	if err != nil {
		return nil, notFoundToNil(err)
	}
	return mapOrderRow(row), nil
}

func (r *PostgresOrderRepository) FindByListingID(ctx context.Context, listingID uuid.UUID) (*ordersdomain.Order, error) {
	row, err := r.q.GetOrderByListingID(ctx, listingID)
	if err != nil {
		return nil, notFoundToNil(err)
	}
	return mapOrderRow(row), nil
}

func (r *PostgresOrderRepository) Search(ctx context.Context, in ordersdomain.SearchInput) ([]*ordersdomain.Order, error) {
	var status *sqlc.OrderStatus
	if in.Status != nil {
		s := sqlc.OrderStatus(*in.Status)
		status = &s
	}
	limit := int32(50)
	if in.Limit != nil {
		limit = *in.Limit
	}
	rows, err := r.q.SearchOrders(ctx, sqlc.SearchOrdersParams{
		ParticipantID: in.ParticipantID,
		BuyerID:       in.BuyerID,
		SellerID:      in.SellerID,
		Status:        status,
		ResultLimit:   limit,
	})
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	out := make([]*ordersdomain.Order, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapOrderRow(row))
	}
	return out, nil
}

// notFoundToNil は ErrNoRows / 22P02 を (nil,nil) 相当に畳む。それ以外は写像して返す。
func notFoundToNil(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	mapped := pgerr.FromPg(err)
	if apperr.IsNotFound(mapped) {
		return nil
	}
	return mapped
}

func mapOrderRow(row sqlc.Order) *ordersdomain.Order {
	return ordersdomain.Rehydrate(ordersdomain.RehydrateInput{
		ID:              row.ID,
		ListingID:       row.ListingID,
		BuyerID:         row.BuyerID,
		SellerID:        row.SellerID,
		Status:          ordersdomain.OrderStatus(row.Status),
		Price:           row.Price,
		Currency:        row.Currency,
		ListingTitle:    row.ListingTitle,
		ListingImageURL: row.ListingImageUrl,
		CreatedAt:       pgconv.Time(row.CreatedAt),
		PaidAt:          pgconv.TimePtr(row.PaidAt),
		ShippedAt:       pgconv.TimePtr(row.ShippedAt),
		ReceivedAt:      pgconv.TimePtr(row.ReceivedAt),
		CompletedAt:     pgconv.TimePtr(row.CompletedAt),
		CanceledAt:      pgconv.TimePtr(row.CanceledAt),
	})
}
