package app

import (
	"context"
	"net/http"
	"time"

	mcpinterface "marketplace/api-go/internal/interface/mcp"
	"marketplace/api-go/internal/shared/imagefetch"
)

// mcpImageFetcher は MCP の ImageFetcher を満たす composition-root アダプタ。
// 公開画像URLを（必要なら IMAGE_FETCH_BASE_URL 経由で）取得し、get_listing のヒーロー画像を
// インライン(base64 ImageContent)で返せるようにする。AI 経路とは別実装（imagefetch 共有ヘルパ）。
type mcpImageFetcher struct {
	client  *http.Client
	baseURL string
}

func newMcpImageFetcher(fetchBaseURL string) *mcpImageFetcher {
	return &mcpImageFetcher{
		client:  &http.Client{Timeout: 10 * time.Second},
		baseURL: fetchBaseURL,
	}
}

func (f *mcpImageFetcher) Fetch(ctx context.Context, url string) ([]byte, string, error) {
	img, err := imagefetch.Fetch(ctx, f.client, f.baseURL, url)
	if err != nil {
		return nil, "", err
	}
	return img.Data, img.MimeType, nil
}

var _ mcpinterface.ImageFetcher = (*mcpImageFetcher)(nil)
