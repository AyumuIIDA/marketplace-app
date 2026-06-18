// content-addressed なオブジェクトストレージの抽象。
// ローカル=fake-gcs / prod=GCS を同一インターフェイスで扱う（adapterは endpoint/creds 差し替えのみ）。
export interface ObjectStorage {
  // key にバイト列を保存する（同一 key は冪等上書き）。
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;

  // 公開GET用の絶対URL。ブラウザが直接読む（BFF非経由の公開アセット）。
  publicUrl(key: string): string;

  // サーバサイド処理がGETする絶対URL。local Dockerでは service name、prodではpublicUrlと同一でよい。
  fetchUrl(key: string): string;
}
