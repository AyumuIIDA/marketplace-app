package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// InTx は単一transaction内でfnを実行する低レベルrunner。
// fnにはpgx.Tx（sqlc.DBTXを満たす）を渡すので、呼び出し側はtx束縛のrepositoryを組み立てる。
// fnがerrorを返すかpanicするとrollback、nilならcommitする。
// 各module/ workflow固有のtx-runnerはこれを土台にrepositoryを束ねる（§10/§11）。
func InTx(ctx context.Context, pool *pgxpool.Pool, fn func(tx pgx.Tx) error) (err error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("db: begin tx: %w", err)
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(ctx)
			panic(p)
		}
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}
		err = tx.Commit(ctx)
	}()

	return fn(tx)
}
