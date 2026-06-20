package app

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketplace/api-go/internal/db/sqlc"
	listingsapp "marketplace/api-go/internal/modules/listings/application"
)

// listingSellerVerifiedAdapter は listings の SellerVerifiedReader を users.human_verified_at の
// バッチ参照で満たす cross-module アダプタ（composition root に置き、peer import を避ける）。
// Seal の正本＝アカウント認証なので、出品カード/詳細の認証マークはここから供給される。
type listingSellerVerifiedAdapter struct {
	q *sqlc.Queries
}

func newListingSellerVerifiedAdapter(pool *pgxpool.Pool) *listingSellerVerifiedAdapter {
	return &listingSellerVerifiedAdapter{q: sqlc.New(pool)}
}

func (a *listingSellerVerifiedAdapter) VerifiedByUserIDs(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]bool, error) {
	out := make(map[uuid.UUID]bool, len(userIDs))
	if len(userIDs) == 0 {
		return out, nil
	}
	rows, err := a.q.ListHumanVerifiedByIDs(ctx, userIDs)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		out[row.ID] = row.HumanVerified
	}
	return out, nil
}

var _ listingsapp.SellerVerifiedReader = (*listingSellerVerifiedAdapter)(nil)
