package aiinfra

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/sync/errgroup"

	"marketplace/api-go/internal/shared/apperr"
)

// inlineImage はLLMマルチモーダル入力用の画像（base64）。
type inlineImage struct {
	MimeType string
	Base64   string
}

const maxImageFetchBytes = 15 * 1024 * 1024

// fetchInlineImages はURL群から画像を並列取得しbase64化する（順序維持）。
// 商品写真はAI出品支援の必須入力なので取得失敗は握りつぶさず境界エラーにする（fail-fast）。
// 独立I/Oのfan-outであり、§16の正当な並行化に該当する。
func fetchInlineImages(ctx context.Context, client *http.Client, fetchBaseURL string, urls []string) ([]inlineImage, error) {
	if len(urls) == 0 {
		return nil, &apperr.AppError{Kind: apperr.KindValidation, Code: "AI_IMAGE_REQUIRED", Message: "At least one product image is required."}
	}
	results := make([]inlineImage, len(urls))
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(8)
	for i, u := range urls {
		i, u := i, u
		g.Go(func() error {
			img, err := fetchInlineImage(ctx, client, fetchBaseURL, u)
			if err != nil {
				return err
			}
			results[i] = img
			return nil
		})
	}
	if err := g.Wait(); err != nil {
		return nil, err
	}
	return results, nil
}

func fetchInlineImage(ctx context.Context, client *http.Client, fetchBaseURL, rawURL string) (inlineImage, error) {
	fetchURL := toFetchableImageURL(fetchBaseURL, rawURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fetchURL, nil)
	if err != nil {
		return inlineImage{}, imageErr("AI_IMAGE_FETCH_FAILED", "Product image could not be fetched.")
	}
	resp, err := client.Do(req)
	if err != nil {
		return inlineImage{}, imageErr("AI_IMAGE_FETCH_FAILED", "Product image could not be fetched.")
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return inlineImage{}, imageErr("AI_IMAGE_FETCH_FAILED", "Product image fetch returned an error.")
	}
	mimeType := resp.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg"
	}
	if !strings.HasPrefix(mimeType, "image/") {
		return inlineImage{}, imageErr("AI_IMAGE_INVALID_CONTENT_TYPE", "Product image URL did not return an image.")
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxImageFetchBytes))
	if err != nil {
		return inlineImage{}, imageErr("AI_IMAGE_FETCH_FAILED", "Product image could not be read.")
	}
	return inlineImage{MimeType: mimeType, Base64: base64.StdEncoding.EncodeToString(data)}, nil
}

// toFetchableImageURL は公開URLを、APIから取得可能なURL（GCS JSON API等）へ書き換える。
// IMAGE_FETCH_BASE_URL 未設定ならそのまま。
func toFetchableImageURL(fetchBaseURL, rawURL string) string {
	if strings.TrimSpace(fetchBaseURL) == "" {
		return rawURL
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	// 既にGCS JSON-API の media URL（/storage/v1/b/... ?alt=media）なら再書き換えしない（二重書き換え防止）。
	if strings.Contains(parsed.Path, "/storage/v1/b/") && parsed.Query().Get("alt") == "media" {
		return rawURL
	}
	const marker = "/marketplace-images/"
	idx := strings.Index(parsed.Path, marker)
	if idx == -1 {
		return rawURL
	}
	key := parsed.Path[idx+len(marker):]
	return fmt.Sprintf("%s/%s?alt=media", strings.TrimRight(fetchBaseURL, "/"), url.PathEscape(key))
}

func imageErr(code, message string) error {
	return &apperr.AppError{Kind: apperr.KindInternal, Code: code, Message: message}
}
