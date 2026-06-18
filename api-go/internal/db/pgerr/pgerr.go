// Package pgerr はpgx/PostgreSQLエラーをProjectのエラー分類へ写像する。
// infrastructure層からのみ使う。apperrをpgxから切り離し、domainがdriverへ
// 推移的に依存しないようにするための分離点。
package pgerr

import (
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"marketplace/api-go/internal/shared/apperr"
)

// FromPg は既存TSのDrizzle挙動に合わせて写像する:
//   - ErrNoRows        -> NotFound(404)
//   - 22P02(不正uuid等) -> NotFound(404)（存在しないidと同義）
//   - その他            -> Infrastructure(500)
//
// 一意制約/FK/check違反はハッピーパスで事前検証される前提のため、例外発生時は基盤エラー(500)。
func FromPg(err error) *apperr.AppError {
	if err == nil {
		return nil
	}
	if existing, ok := apperr.As(err); ok {
		return existing
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return (&apperr.AppError{Kind: apperr.KindNotFound, Code: "NOT_FOUND", Message: "resource not found"}).Wrap(err)
	}

	var pg *pgconn.PgError
	if errors.As(err, &pg) {
		if pg.Code == "22P02" { // invalid_text_representation
			return (&apperr.AppError{Kind: apperr.KindNotFound, Code: "NOT_FOUND", Message: "resource not found"}).Wrap(err)
		}
	}
	return apperr.Infrastructure("database error", err)
}
