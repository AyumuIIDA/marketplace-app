package db

import "embed"

// MigrationsFS はgoose migrationを実行ファイルへ埋め込む。
// Cloud Runでも外部ファイル無しでmigrateできる。
//
//go:embed migrations/*.sql
var MigrationsFS embed.FS
