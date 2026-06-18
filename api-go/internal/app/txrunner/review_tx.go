package txrunner

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketplace/api-go/internal/app/workflows"
	"marketplace/api-go/internal/db"
	ordersinfra "marketplace/api-go/internal/modules/orders/infrastructure"
	reviewsinfra "marketplace/api-go/internal/modules/reviews/infrastructure"
	signaturesinfra "marketplace/api-go/internal/modules/signatures/infrastructure"
)

// ReviewTxRunner は db.InTx で1 transactionを張り、orders/reviews/signatures のtx-bound repoを束ねる。
type ReviewTxRunner struct {
	pool *pgxpool.Pool
}

func NewReviewTxRunner(pool *pgxpool.Pool) *ReviewTxRunner {
	return &ReviewTxRunner{pool: pool}
}

func (r *ReviewTxRunner) Run(ctx context.Context, fn func(ctx context.Context, repos workflows.ReviewRepos) error) error {
	return db.InTx(ctx, r.pool, func(tx pgx.Tx) error {
		repos := workflows.ReviewRepos{
			Orders:               ordersinfra.NewPostgresOrderRepository(tx),
			Reviews:              reviewsinfra.NewPostgresReviewRepository(tx),
			HumanSignatures:      signaturesinfra.NewPostgresHumanSignatureRepository(tx),
			WorldIDVerifications: signaturesinfra.NewPostgresWorldIdVerificationRepository(tx),
		}
		return fn(ctx, repos)
	})
}

var _ workflows.ReviewTxRunner = (*ReviewTxRunner)(nil)
