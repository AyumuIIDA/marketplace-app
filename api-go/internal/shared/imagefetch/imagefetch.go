// Package imagefetch は公開画像URLからバイト列を取得する小さなヘルパ。
// MCP の get_listing がヒーロー画像をインライン(base64 ImageContent)で返すために使う。
//
// NOTE(dedup): aiassistance/infrastructure に同等の取得+URL書換ロジックがある
// （AI マルチモーダル入力用、base64 文字列を返す版）。将来そちらも本パッケージへ寄せて一本化したい。
// 現状は AI 経路を触らない安全側のため別実装にしている。
package imagefetch

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// MaxBytes は1枚あたりの取得上限（DoS/巨大画像対策）。
const MaxBytes = 15 * 1024 * 1024

// Image は取得した画像（生バイト＋MIME）。
type Image struct {
	MimeType string
	Data     []byte
}

// Fetch は rawURL（公開URL）を取得可能なURLへ書き換えてGETし、画像バイトを返す。
func Fetch(ctx context.Context, client *http.Client, fetchBaseURL, rawURL string) (Image, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, ToFetchableURL(fetchBaseURL, rawURL), nil)
	if err != nil {
		return Image{}, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return Image{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return Image{}, fmt.Errorf("image fetch returned status %d", resp.StatusCode)
	}
	mimeType := resp.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg"
	}
	if !strings.HasPrefix(mimeType, "image/") {
		return Image{}, fmt.Errorf("url did not return an image: %s", mimeType)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, MaxBytes))
	if err != nil {
		return Image{}, err
	}
	return Image{MimeType: mimeType, Data: data}, nil
}

// ToFetchableURL は公開URLを、サーバから取得可能なURL（GCS JSON API media 等）へ書き換える。
// fetchBaseURL 未設定ならそのまま。二重書換は防ぐ。
func ToFetchableURL(fetchBaseURL, rawURL string) string {
	if strings.TrimSpace(fetchBaseURL) == "" {
		return rawURL
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
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
