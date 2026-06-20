// Package recommendationapp は意味検索/類似のPortを定義する。
// ベクトル埋め込みと検索は外部サービス(recommendation-py)に委ね、ここはその抽象だけを持つ。
package recommendationapp

import "context"

// SearchHit はベクトル検索の1結果。出品本体は呼び出し側がhydrateするため、IDとスコアのみ。
type SearchHit struct {
	ListingID string
	Score     float32
}

// SearchFilter は前段の構造化フィルタ（vector側payloadへ適用）。各ポインタはnilで無効。
type SearchFilter struct {
	Categories       []string
	MinPrice         *int32
	MaxPrice         *int32
	Status           *string
	ExcludeListingID string
}

// IndexInput は1出品の埋め込み投入入力（publish時/バックフィルで使用）。
type IndexInput struct {
	ListingID   string
	ImageURL    string
	Title       string
	Description string
	Category    string
	Price       int32
	Status      string
	SellerID    string
}

// VectorIndex は埋め込み生成＋ベクトル検索の外部port。
// 検索系は該当なしを空スライスで返し、基盤障害のみ error を返す。
type VectorIndex interface {
	SearchByText(ctx context.Context, query string, topK int32, filter SearchFilter) ([]SearchHit, error)
	SimilarItems(ctx context.Context, listingID string, topK int32, filter SearchFilter) ([]SearchHit, error)
	Index(ctx context.Context, in IndexInput) error
	Delete(ctx context.Context, listingID string) error
	// Healthy はベクトル検索バックエンドが利用可能か（モデルロード＋インデックス到達）を返す。
	// 意味検索ツールの可用性判定に使う。縮退実装は false を返す。
	Healthy(ctx context.Context) bool
}
