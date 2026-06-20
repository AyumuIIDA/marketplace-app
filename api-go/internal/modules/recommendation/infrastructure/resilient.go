package recommendationinfra

import (
	"context"
	"log/slog"
	"sync"

	recommendationapp "marketplace/api-go/internal/modules/recommendation/application"
)

// ResilientVectorIndex は基盤障害（サービス未起動/到達不可/RPCエラー）を縮退へ変換する decorator。
// 「設定済みだがサービスが落ちている」ケースでも 500 にせず、検索系は空結果に、書込系は no-op に落とす
// （取引などコア機能を止めない／discover は空結果→keyword 検索へフォールバック）。
//
// 監視性: 失敗のたびに記録するとログが氾濫し、かえって信号が埋もれる。よって縮退の「エッジ」だけ記録する
// ＝ healthy→degraded に入った最初の1回だけ Warn、degraded→recovered で Info。これで障害は
// 「開始1行＋復旧1行」に圧縮され、発生・復旧の時刻が一目で分かりログコストも抑えられる。
// Healthy は内側へ委譲（HealthCheck で真の可用性を返す＝MCPツールの可用性判定はそのまま機能）。
type ResilientVectorIndex struct {
	inner recommendationapp.VectorIndex

	mu       sync.Mutex
	degraded bool
}

func NewResilientVectorIndex(inner recommendationapp.VectorIndex) *ResilientVectorIndex {
	return &ResilientVectorIndex{inner: inner}
}

// noteFailure は縮退突入時のみ Warn（継続中は抑制＝ログ氾濫防止）。
func (r *ResilientVectorIndex) noteFailure(ctx context.Context, op string, err error) {
	r.mu.Lock()
	first := !r.degraded
	r.degraded = true
	r.mu.Unlock()
	if first {
		slog.WarnContext(ctx, "recommendation degraded; serving empty/no-op until it recovers",
			slog.String("op", op), slog.String("error", err.Error()))
	}
}

// noteSuccess は復旧（縮退→正常）のエッジで Info。
func (r *ResilientVectorIndex) noteSuccess(ctx context.Context) {
	r.mu.Lock()
	recovered := r.degraded
	r.degraded = false
	r.mu.Unlock()
	if recovered {
		slog.InfoContext(ctx, "recommendation recovered; semantic search restored")
	}
}

func (r *ResilientVectorIndex) SearchByText(ctx context.Context, query string, topK int32, f recommendationapp.SearchFilter) ([]recommendationapp.SearchHit, error) {
	hits, err := r.inner.SearchByText(ctx, query, topK, f)
	if err != nil {
		r.noteFailure(ctx, "SearchByText", err)
		return nil, nil
	}
	r.noteSuccess(ctx)
	return hits, nil
}

func (r *ResilientVectorIndex) SimilarItems(ctx context.Context, listingID string, topK int32, f recommendationapp.SearchFilter) ([]recommendationapp.SearchHit, error) {
	hits, err := r.inner.SimilarItems(ctx, listingID, topK, f)
	if err != nil {
		r.noteFailure(ctx, "SimilarItems", err)
		return nil, nil
	}
	r.noteSuccess(ctx)
	return hits, nil
}

func (r *ResilientVectorIndex) Index(ctx context.Context, in recommendationapp.IndexInput) error {
	if err := r.inner.Index(ctx, in); err != nil {
		r.noteFailure(ctx, "Index", err)
		return nil // ベストエフォート: 埋め込み失敗で publish を止めない。
	}
	r.noteSuccess(ctx)
	return nil
}

func (r *ResilientVectorIndex) Delete(ctx context.Context, listingID string) error {
	if err := r.inner.Delete(ctx, listingID); err != nil {
		r.noteFailure(ctx, "Delete", err)
		return nil
	}
	r.noteSuccess(ctx)
	return nil
}

func (r *ResilientVectorIndex) Healthy(ctx context.Context) bool {
	return r.inner.Healthy(ctx)
}

var _ recommendationapp.VectorIndex = (*ResilientVectorIndex)(nil)
