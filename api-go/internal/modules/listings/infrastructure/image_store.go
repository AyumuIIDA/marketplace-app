package listingsinfra

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"image"

	"github.com/disintegration/imaging"

	listingsapp "github.com/outarc/marketplace/api-go/internal/modules/listings/application"
	"github.com/outarc/marketplace/api-go/internal/shared/apperr"
	sharedstorage "github.com/outarc/marketplace/api-go/internal/shared/storage"
)

// maxDimension はアップロード画像の最大辺。seedと揃え解像度/容量を抑える。
const maxDimension = 1024

// maxPixels はデコード前に弾く画素数上限（約40MP）。
// 小容量で巨大寸法を宣言するdecompression bomb（例: 30000x30000≒3.6GB）でのOOMを防ぐ。
const maxPixels = 40_000_000

// ImagingListingImageStore は画像を正規化(回転補正・縮小・JPEG再エンコード)し、
// sha256でcontent-addressedに保存する。同一バイト列は同一keyとなり重複格納を避ける。
type ImagingListingImageStore struct {
	storage sharedstorage.ObjectStorage
}

func NewImagingListingImageStore(s sharedstorage.ObjectStorage) *ImagingListingImageStore {
	return &ImagingListingImageStore{storage: s}
}

func (s *ImagingListingImageStore) Upload(ctx context.Context, data []byte) (listingsapp.UploadedImage, error) {
	// 先にヘッダだけで寸法を確認し、巨大画像はフルデコード前に弾く（OOM対策）。
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return listingsapp.UploadedImage{}, apperr.Validation("Uploaded file is not a valid image.",
			apperr.FieldError{Field: "file", Reason: "invalid_image"})
	}
	if int64(cfg.Width)*int64(cfg.Height) > maxPixels {
		return listingsapp.UploadedImage{}, apperr.Validation("Image dimensions are too large.",
			apperr.FieldError{Field: "file", Reason: "too_many_pixels"})
	}

	img, err := imaging.Decode(bytes.NewReader(data), imaging.AutoOrientation(true))
	if err != nil {
		return listingsapp.UploadedImage{}, apperr.Validation("Uploaded file is not a valid image.",
			apperr.FieldError{Field: "file", Reason: "invalid_image"})
	}

	// Fit は縦横比を保ちながら範囲内に縮小する（元が小さければそのまま=拡大しない）。
	fitted := imaging.Fit(img, maxDimension, maxDimension, imaging.Lanczos)

	var buf bytes.Buffer
	if err := imaging.Encode(&buf, fitted, imaging.JPEG, imaging.JPEGQuality(82)); err != nil {
		return listingsapp.UploadedImage{}, apperr.Internal("image encode failed", err)
	}
	normalized := buf.Bytes()

	sum := sha256.Sum256(normalized)
	hash := hex.EncodeToString(sum[:])
	key := fmt.Sprintf("listings/%s.jpg", hash)

	res, err := s.storage.Put(ctx, key, normalized, "image/jpeg")
	if err != nil {
		return listingsapp.UploadedImage{}, apperr.Infrastructure("image upload failed", err)
	}
	return listingsapp.UploadedImage{URL: res.URL, Hash: hash}, nil
}

var _ listingsapp.ListingImageStore = (*ImagingListingImageStore)(nil)

// unavailableImageStore はストレージ未設定時のフォールバック。
// アップロードのみ失敗し、画像不要の他機能は起動・動作できる。
type unavailableImageStore struct{ reason string }

// NewUnavailableImageStore はストレージ未構成時に使うエラー専用storeを返す。
func NewUnavailableImageStore(reason string) listingsapp.ListingImageStore {
	return &unavailableImageStore{reason: reason}
}

func (s *unavailableImageStore) Upload(_ context.Context, _ []byte) (listingsapp.UploadedImage, error) {
	return listingsapp.UploadedImage{}, apperr.Infrastructure("image storage unavailable: "+s.reason, nil)
}
