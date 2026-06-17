// 出品画像のアップロード境界。バイト列を受け取り、正規化・content-addressed保存して
// 公開URLとhashを返す。実装(infrastructure)はObjectStorage + 画像処理に依存する。
export type UploadedListingImage = {
  url: string;
  hash: string;
};

export interface ListingImageStore {
  upload(bytes: Uint8Array): Promise<UploadedListingImage>;
}
