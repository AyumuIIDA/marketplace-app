import { Storage } from "@google-cloud/storage";

import type { ObjectStorage } from "./object-storage.port.js";

export type GcsObjectStorageConfig = {
  bucket: string;
  // 公開読取URLの基底。ブラウザ到達のホスト（local=fake-gcs / prod=GCS or CDN）。
  publicBaseUrl: string;
};

// @google-cloud/storage を用いた実装。
// STORAGE_EMULATOR_HOST があればSDKが自動でemulatorへ向き、prodは ADC + 本物GCS。
// コードは不変で endpoint/creds のみ差し替わる。
export class GcsObjectStorage implements ObjectStorage {
  private readonly storage: Storage;

  constructor(private readonly config: GcsObjectStorageConfig) {
    this.storage = new Storage();
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.storage
      .bucket(this.config.bucket)
      .file(key)
      .save(Buffer.from(body), { contentType, resumable: false });
  }

  publicUrl(key: string): string {
    return `${this.config.publicBaseUrl}/${key}`;
  }
}
