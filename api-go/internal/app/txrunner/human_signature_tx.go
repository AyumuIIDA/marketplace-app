package txrunner

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/outarc/marketplace/api-go/internal/app/workflows"
	"github.com/outarc/marketplace/api-go/internal/db"
	listingsinfra "github.com/outarc/marketplace/api-go/internal/modules/listings/infrastructure"
	signaturesinfra "github.com/outarc/marketplace/api-go/internal/modules/signatures/infrastructure"
)

// HumanSignatureTxRunner は db.InTx で1 transactionを張り、listings/signatures のtx-bound repoを束ねる。
type HumanSignatureTxRunner struct {
	pool *pgxpool.Pool
}

func NewHumanSignatureTxRunner(pool *pgxpool.Pool) *HumanSignatureTxRunner {
	return &HumanSignatureTxRunner{pool: pool}
}

func (r *HumanSignatureTxRunner) Run(ctx context.Context, fn func(ctx context.Context, repos workflows.HumanSignatureRepos) error) error {
	return db.InTx(ctx, r.pool, func(tx pgx.Tx) error {
		repos := workflows.HumanSignatureRepos{
			Listings:             listingsinfra.NewPostgresListingRepository(tx),
			HumanSignatures:      signaturesinfra.NewPostgresHumanSignatureRepository(tx),
			WorldIDVerifications: signaturesinfra.NewPostgresWorldIdVerificationRepository(tx),
		}
		return fn(ctx, repos)
	})
}

var _ workflows.HumanSignatureTxRunner = (*HumanSignatureTxRunner)(nil)
