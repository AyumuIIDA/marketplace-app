// Package reviewsinfra はレビューのrepositoryをsqlc/pgxで実装する。
package reviewsinfra

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"marketplace/api-go/internal/db/pgerr"
	"marketplace/api-go/internal/db/sqlc"
	reviewsdomain "marketplace/api-go/internal/modules/reviews/domain"
	"marketplace/api-go/internal/shared/apperr"
	"marketplace/api-go/internal/shared/pgconv"
)

// PostgresReviewRepository はReviewRepositoryのpostgres実装。
type PostgresReviewRepository struct {
	q *sqlc.Queries
}

func NewPostgresReviewRepository(db sqlc.DBTX) *PostgresReviewRepository {
	return &PostgresReviewRepository{q: sqlc.New(db)}
}

func (r *PostgresReviewRepository) Save(ctx context.Context, rv *reviewsdomain.Review) error {
	err := r.q.UpsertReview(ctx, sqlc.UpsertReviewParams{
		ID:          rv.ID(),
		OrderID:     rv.OrderID(),
		ReviewerID:  rv.ReviewerID(),
		RevieweeID:  rv.RevieweeID(),
		AgentID:     rv.AgentID(),
		Rating:      rv.Rating(),
		Comment:     rv.Comment(),
		Status:      sqlc.ReviewStatus(rv.Status()),
		SignatureID: rv.SignatureID(),
		CreatedAt:   pgconv.Timestamptz(rv.CreatedAt()),
		SubmittedAt: pgconv.TimestamptzPtr(rv.SubmittedAt()),
		HiddenAt:    pgconv.TimestamptzPtr(rv.HiddenAt()),
	})
	if err != nil {
		return pgerr.FromPg(err)
	}
	return nil
}

func (r *PostgresReviewRepository) FindByID(ctx context.Context, id uuid.UUID) (*reviewsdomain.Review, error) {
	row, err := r.q.GetReviewByID(ctx, id)
	if err != nil {
		return nil, notFoundToNil(err)
	}
	return mapReviewRow(row), nil
}

func (r *PostgresReviewRepository) FindSubmittedByOrderReviewer(ctx context.Context, orderID, reviewerID uuid.UUID) (*reviewsdomain.Review, error) {
	row, err := r.q.FindSubmittedReviewByOrderReviewer(ctx, sqlc.FindSubmittedReviewByOrderReviewerParams{
		OrderID:    orderID,
		ReviewerID: reviewerID,
	})
	if err != nil {
		return nil, notFoundToNil(err)
	}
	return mapReviewRow(row), nil
}

func (r *PostgresReviewRepository) Search(ctx context.Context, in reviewsdomain.SearchInput) ([]*reviewsdomain.Review, error) {
	var status *sqlc.ReviewStatus
	if in.Status != nil {
		s := sqlc.ReviewStatus(*in.Status)
		status = &s
	}
	limit := int32(50)
	if in.Limit != nil {
		limit = *in.Limit
	}
	rows, err := r.q.SearchReviews(ctx, sqlc.SearchReviewsParams{
		OrderID:     in.OrderID,
		ReviewerID:  in.ReviewerID,
		RevieweeID:  in.RevieweeID,
		Status:      status,
		ResultLimit: limit,
	})
	if err != nil {
		return nil, pgerr.FromPg(err)
	}
	out := make([]*reviewsdomain.Review, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapReviewRow(row))
	}
	return out, nil
}

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

func mapReviewRow(row sqlc.Review) *reviewsdomain.Review {
	return reviewsdomain.Rehydrate(reviewsdomain.RehydrateInput{
		ID:          row.ID,
		OrderID:     row.OrderID,
		ReviewerID:  row.ReviewerID,
		RevieweeID:  row.RevieweeID,
		AgentID:     row.AgentID,
		Rating:      row.Rating,
		Comment:     row.Comment,
		Status:      reviewsdomain.ReviewStatus(row.Status),
		SignatureID: row.SignatureID,
		CreatedAt:   pgconv.Time(row.CreatedAt),
		SubmittedAt: pgconv.TimePtr(row.SubmittedAt),
		HiddenAt:    pgconv.TimePtr(row.HiddenAt),
	})
}
