package recommendationinfra

import (
	"context"

	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
)

// UnavailableVectorIndex は recommendation サービス未設定時の縮退実装。
// 検索は空結果を返し（フロントはkeyword検索へフォールバック）、index/deleteはno-op。
// 取引などコア機能はこの縮退に影響されない。
type UnavailableVectorIndex struct{}

// NewUnavailableVectorIndex は縮退実装を返す。
func NewUnavailableVectorIndex() *UnavailableVectorIndex { return &UnavailableVectorIndex{} }

func (UnavailableVectorIndex) SearchByText(context.Context, string, int32, recommendationapp.SearchFilter) ([]recommendationapp.SearchHit, error) {
	return nil, nil
}

func (UnavailableVectorIndex) SimilarItems(context.Context, string, int32, recommendationapp.SearchFilter) ([]recommendationapp.SearchHit, error) {
	return nil, nil
}

func (UnavailableVectorIndex) Index(context.Context, recommendationapp.IndexInput) error { return nil }

func (UnavailableVectorIndex) Delete(context.Context, string) error { return nil }
