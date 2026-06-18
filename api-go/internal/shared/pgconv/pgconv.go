// Package pgconv はdomainの値型とsqlc(pgtype)の相互変換を集約する。
// infrastructure層からのみ使う薄いヘルパ。
package pgconv

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// Timestamptz はtime.Timeを非NULLのpgtype.Timestamptzへ変換する。
func Timestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}

// TimestamptzPtr は*time.Timeを変換する。nilならNULL。
func TimestamptzPtr(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{Valid: false}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

// TimePtr はpgtype.Timestamptzを*time.Timeへ。NULLならnil。
// JSONで既存TS(toISOString=UTC "Z")と一致させるためUTCへ正規化する。
func TimePtr(ts pgtype.Timestamptz) *time.Time {
	if !ts.Valid {
		return nil
	}
	t := ts.Time.UTC()
	return &t
}

// Time はpgtype.Timestamptzをtime.Timeへ（非NULL前提のcreated_at等に使う）。UTC正規化。
func Time(ts pgtype.Timestamptz) time.Time {
	return ts.Time.UTC()
}

// StrPtr は空でも値を保持する*stringを返す（NULL列の素直な表現）。
func StrPtr(s string) *string {
	return &s
}
