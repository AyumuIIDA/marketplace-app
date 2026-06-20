package app

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"marketplace/api-go/internal/db/sqlc"
	aiapp "marketplace/api-go/internal/modules/aiassistance/application"
)

// aiCategoryAdapter は aiassistance の CategoryReader を listings の distinct カテゴリで満たす
// cross-module アダプタ（composition root に置き、peer import を避ける）。
// カテゴリのライフサイクルは未管理＝シード(abo)由来の既存データを正本に AI へ制約として渡す。
type aiCategoryAdapter struct {
	q *sqlc.Queries
}

func newAiCategoryAdapter(pool *pgxpool.Pool) *aiCategoryAdapter {
	return &aiCategoryAdapter{q: sqlc.New(pool)}
}

func (a *aiCategoryAdapter) Categories(ctx context.Context) ([]string, error) {
	return a.q.ListDistinctCategories(ctx)
}

var _ aiapp.CategoryReader = (*aiCategoryAdapter)(nil)
