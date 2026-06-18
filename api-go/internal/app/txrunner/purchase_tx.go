// Package txrunner はworkflowのtransaction境界（tx-runner）の具体実装を提供する。
// workflowパッケージとは分離し、pgx/infraへの依存をworkflow本体から隔離する。
package txrunner

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/outarc/marketplace/api-go/internal/app/workflows"
	"github.com/outarc/marketplace/api-go/internal/db"
	listingsinfra "github.com/outarc/marketplace/api-go/internal/modules/listings/infrastructure"
	ordersinfra "github.com/outarc/marketplace/api-go/internal/modules/orders/infrastructure"
)

// PurchaseTxRunner は db.InTx で1 transactionを張り、tx-bound repoを束ねて渡す。
type PurchaseTxRunner struct {
	pool *pgxpool.Pool
}

func NewPurchaseTxRunner(pool *pgxpool.Pool) *PurchaseTxRunner {
	return &PurchaseTxRunner{pool: pool}
}

func (r *PurchaseTxRunner) Run(ctx context.Context, fn func(ctx context.Context, repos workflows.PurchaseRepos) error) error {
	return db.InTx(ctx, r.pool, func(tx pgx.Tx) error {
		repos := workflows.PurchaseRepos{
			Listings: listingsinfra.NewPostgresListingRepository(tx),
			Orders:   ordersinfra.NewPostgresOrderRepository(tx),
		}
		return fn(ctx, repos)
	})
}

var _ workflows.PurchaseTxRunner = (*PurchaseTxRunner)(nil)
