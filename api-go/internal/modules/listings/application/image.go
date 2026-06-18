package listingsapp

import "context"

// UploadedImage は画像アップロードの結果（公開URLと内容hash）。
type UploadedImage struct {
	URL  string `json:"url"`
	Hash string `json:"hash"`
}

// ListingImageStore は出品画像のアップロード境界（driven port）。
// バイト列を正規化・content-addressed保存して公開URLとhashを返す。
type ListingImageStore interface {
	Upload(ctx context.Context, bytes []byte) (UploadedImage, error)
}

// UploadListingImageUseCase は画像をアップロードして{url,hash}を返す。
type UploadListingImageUseCase struct {
	store ListingImageStore
}

func NewUploadListingImageUseCase(s ListingImageStore) *UploadListingImageUseCase {
	return &UploadListingImageUseCase{store: s}
}

func (uc *UploadListingImageUseCase) Execute(ctx context.Context, bytes []byte) (UploadedImage, error) {
	return uc.store.Upload(ctx, bytes)
}
