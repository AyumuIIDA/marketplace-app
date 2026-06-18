// Package storage はオブジェクトストレージ(GCS)のportを定義する。
// 実装は infrastructure 側（GCS / fake-gcs-server）に置く。
package storage

import "context"

// PutResult は保存結果。公開URLは PublicBaseURL/Key で組み立てる。
type PutResult struct {
	Key string
	URL string
}

// ObjectStorage は画像など不変オブジェクトの保存port。
// 内容ハッシュをkeyに使う前提（同一内容は同一key）で冪等。
type ObjectStorage interface {
	// Put はcontentType付きでオブジェクトを保存し、公開URLを返す。
	Put(ctx context.Context, key string, data []byte, contentType string) (PutResult, error)
}
