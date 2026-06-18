package txrunner

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"marketplace/api-go/internal/app/workflows"
	"marketplace/api-go/internal/db"
	messagesinfra "marketplace/api-go/internal/modules/messages/infrastructure"
	ordersinfra "marketplace/api-go/internal/modules/orders/infrastructure"
)

// MessageTxRunner は db.InTx で1 transactionを張り、orders/messages のtx-bound repoを束ねて渡す。
type MessageTxRunner struct {
	pool *pgxpool.Pool
}

func NewMessageTxRunner(pool *pgxpool.Pool) *MessageTxRunner {
	return &MessageTxRunner{pool: pool}
}

func (r *MessageTxRunner) Run(ctx context.Context, fn func(ctx context.Context, repos workflows.MessageRepos) error) error {
	return db.InTx(ctx, r.pool, func(tx pgx.Tx) error {
		repos := workflows.MessageRepos{
			Orders:   ordersinfra.NewPostgresOrderRepository(tx),
			Messages: messagesinfra.NewPostgresMessageRepository(tx),
		}
		return fn(ctx, repos)
	})
}

var _ workflows.MessageTxRunner = (*MessageTxRunner)(nil)
