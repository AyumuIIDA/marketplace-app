// Command migrate はgooseでDBスキーマを適用する（webプロセスとは分離）。
// 使用例:
//
//	DATABASE_URL=... go run ./cmd/migrate up
//	DATABASE_URL=... go run ./cmd/migrate status
//	DATABASE_URL=... go run ./cmd/migrate up-to 0   # 既存DBにbaselineをstampのみ
//
// 既存 marketplace_domain はdrizzleで同一スキーマが既存のため、新規DDLは流さず
// version stampのみを行うこと（README参照）。
package main

import (
	"context"
	"database/sql"
	"log/slog"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib" // database/sql 用に "pgx" driverを登録
	"github.com/pressly/goose/v3"

	"github.com/outarc/marketplace/api-go/internal/db"
)

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		args = []string{"up"}
	}
	command := args[0]
	rest := args[1:]

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		slog.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	sqlDB, err := sql.Open("pgx", databaseURL)
	if err != nil {
		slog.Error("open db failed", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer sqlDB.Close()

	goose.SetBaseFS(db.MigrationsFS)
	if err := goose.SetDialect("postgres"); err != nil {
		slog.Error("set dialect failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	if err := goose.RunContext(context.Background(), command, sqlDB, "migrations", rest...); err != nil {
		slog.Error("migrate failed", slog.String("command", command), slog.String("error", err.Error()))
		os.Exit(1)
	}
}
