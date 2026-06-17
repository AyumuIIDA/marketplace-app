import crypto from "node:crypto";

import sharp from "sharp";

import { ValidationAppError, type ObjectStorage } from "../../../shared/index.js";
import type { ListingImageStore, UploadedListingImage } from "../application/index.js";

// アップロード画像の最大辺。seedと揃え、demoの解像度と容量のバランスを取る。
const MAX_DIMENSION = 1024;

// sharpで正規化(回転補正・縮小・JPEG再エンコード)し、sha256でcontent-addressedに保存する。
// 同一バイト列は同一keyとなり重複格納を避ける。ObjectStorageでendpointはlocal/prod差し替え。
export class SharpListingImageStore implements ListingImageStore {
  constructor(private readonly objectStorage: ObjectStorage) {}

  async upload(bytes: Uint8Array): Promise<UploadedListingImage> {
    let normalized: Buffer;

    try {
      normalized = await sharp(Buffer.from(bytes))
        .rotate()
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch {
      throw new ValidationAppError("Uploaded file is not a valid image.", {
        resourceType: "listing_image",
      });
    }

    const hash = crypto.createHash("sha256").update(normalized).digest("hex");
    const key = `listings/${hash}.jpg`;

    await this.objectStorage.put(key, normalized, "image/jpeg");

    return { url: this.objectStorage.publicUrl(key), hash };
  }
}
