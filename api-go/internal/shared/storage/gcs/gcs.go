// Package gcsstorage は ObjectStorage を Google Cloud Storage で実装する。
// STORAGE_EMULATOR_HOST があればSDKが自動でemulator(fake-gcs-server)へ向き、
// 本番はADC + 実GCS。コードは不変でendpoint/credsのみ差し替わる。
package gcsstorage

import (
	"context"
	"fmt"

	gcs "cloud.google.com/go/storage"

	sharedstorage "marketplace/api-go/internal/shared/storage"
)

type GcsObjectStorage struct {
	client        *gcs.Client
	bucket        string
	publicBaseURL string
}

// New はGCSクライアントを生成する。publicBaseURL は公開GET用の基底URL。
func New(ctx context.Context, bucket, publicBaseURL string) (*GcsObjectStorage, error) {
	client, err := gcs.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("gcs: new client: %w", err)
	}
	return &GcsObjectStorage{client: client, bucket: bucket, publicBaseURL: publicBaseURL}, nil
}

func (s *GcsObjectStorage) Close() error { return s.client.Close() }

// Put はオブジェクトを保存し、公開URLを返す（同一keyは冪等上書き）。
func (s *GcsObjectStorage) Put(ctx context.Context, key string, data []byte, contentType string) (sharedstorage.PutResult, error) {
	w := s.client.Bucket(s.bucket).Object(key).NewWriter(ctx)
	w.ContentType = contentType
	if _, err := w.Write(data); err != nil {
		_ = w.Close()
		return sharedstorage.PutResult{}, fmt.Errorf("gcs: write %q: %w", key, err)
	}
	if err := w.Close(); err != nil {
		return sharedstorage.PutResult{}, fmt.Errorf("gcs: close %q: %w", key, err)
	}
	return sharedstorage.PutResult{Key: key, URL: fmt.Sprintf("%s/%s", s.publicBaseURL, key)}, nil
}

var _ sharedstorage.ObjectStorage = (*GcsObjectStorage)(nil)
