// Command migrate はgooseでDBスキーマを適用する（webプロセスとは分離）。
// 使用例:
//
//	DATABASE_URL=... go run ./cmd/migrate up
//	DATABASE_URL=... go run ./cmd/migrate status
//	DATABASE_URL=... go run ./cmd/migrate stamp 1   # baselineを「適用済み」と記録(DDL不実行)
//
// 既存 marketplace_domain は別系統(drizzle)で同等スキーマが作成済みのため、baseline(00001)は
// 流さず `stamp 1` で採用し、以後の差分(00002〜)のみ `up` で適用する（README参照）。
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"strconv"

	_ "github.com/jackc/pgx/v5/stdlib" // database/sql 用に "pgx" driverを登録
	"github.com/pressly/goose/v3"

	"marketplace/api-go/internal/db"
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

	// stamp はgooseの標準コマンドに無い「baseline採用」操作。
	// 既存スキーマ(drizzle作成済み)へ goose を非破壊で導入する際に使う。
	if command == "stamp" {
		if err := stampTo(sqlDB, rest); err != nil {
			slog.Error("stamp failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
		return
	}

	if err := goose.RunContext(context.Background(), command, sqlDB, "migrations", rest...); err != nil {
		slog.Error("migrate failed", slog.String("command", command), slog.String("error", err.Error()))
		os.Exit(1)
	}
}

// stampTo は target version 以下のmigrationを、DDLを実行せずに「適用済み」として記録する。
// 既存DB（別系統で同等スキーマを作成済み）に goose を採用するための baseline 操作で、
// Flyway baseline / Liquibase changelogSync に相当する。冪等（既記録分はskip）。
func stampTo(sqlDB *sql.DB, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("stamp requires a target version, e.g. `stamp 1`")
	}
	target, err := strconv.ParseInt(args[0], 10, 64)
	if err != nil {
		return fmt.Errorf("invalid version %q: %w", args[0], err)
	}

	// goose管理テーブルを作成し、初期version(0)を保証する。
	if _, err := goose.EnsureDBVersion(sqlDB); err != nil {
		return fmt.Errorf("ensure goose version table: %w", err)
	}

	migrations, err := goose.CollectMigrations("migrations", 0, target)
	if err != nil {
		return fmt.Errorf("collect migrations up to %d: %w", target, err)
	}

	for _, m := range migrations {
		var applied bool
		if err := sqlDB.QueryRow(
			`SELECT EXISTS (SELECT 1 FROM goose_db_version WHERE version_id = $1 AND is_applied)`,
			m.Version,
		).Scan(&applied); err != nil {
			return fmt.Errorf("check version %d: %w", m.Version, err)
		}
		if applied {
			slog.Info("stamp skip (already applied)", slog.Int64("version", m.Version))
			continue
		}
		if _, err := sqlDB.Exec(
			`INSERT INTO goose_db_version (version_id, is_applied) VALUES ($1, true)`,
			m.Version,
		); err != nil {
			return fmt.Errorf("stamp version %d: %w", m.Version, err)
		}
		slog.Info("stamped (recorded as applied without running DDL)", slog.Int64("version", m.Version))
	}
	return nil
}
