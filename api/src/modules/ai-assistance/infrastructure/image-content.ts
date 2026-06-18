import { AppError } from "../../../shared/index.js";

// LLMマルチモーダル入力のための画像取得ユーティリティ。
// APIプロセスから到達可能なURL（local=fake-gcs / prod=GCS）からバイトを取得しbase64へ変換する。
// 商品写真はAI出品支援の必須入力なので、取得失敗は握りつぶさず境界エラーにする。
export type InlineImage = {
  mimeType: string;
  base64: string;
};

export async function fetchInlineImages(urls: string[]): Promise<InlineImage[]> {
  if (urls.length === 0) {
    throw new AppError("AI_IMAGE_REQUIRED", "At least one product image is required.", 400);
  }

  const results = await Promise.all(urls.map(fetchInlineImage));

  return results;
}

async function fetchInlineImage(url: string): Promise<InlineImage> {
  const fetchUrl = toFetchableImageUrl(url);
  let response: Response;

  try {
    response = await fetch(fetchUrl);
  } catch {
    throw new AppError("AI_IMAGE_FETCH_FAILED", "Product image could not be fetched.", 502, {
      imageUrl: url,
      fetchUrl,
    });
  }

  if (!response.ok) {
    throw new AppError("AI_IMAGE_FETCH_FAILED", "Product image fetch returned an error.", 502, {
      imageUrl: url,
      fetchUrl,
      status: response.status,
    });
  }

  const mimeType = response.headers.get("content-type") ?? "image/jpeg";

  if (!mimeType.startsWith("image/")) {
    throw new AppError("AI_IMAGE_INVALID_CONTENT_TYPE", "Product image URL did not return an image.", 502, {
      imageUrl: url,
      fetchUrl,
      mimeType,
    });
  }

  const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");

  return { mimeType, base64 };
}

function toFetchableImageUrl(url: string): string {
  const fetchBaseUrl = process.env.IMAGE_FETCH_BASE_URL;

  if (fetchBaseUrl === undefined || fetchBaseUrl.trim().length === 0) {
    return url;
  }

  try {
    const parsed = new URL(url);

    if (parsed.pathname.includes("/storage/v1/b/") && parsed.searchParams.get("alt") === "media") {
      return url;
    }

    const marker = "/marketplace-images/";
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return url;
    }

    const key = parsed.pathname.slice(markerIndex + marker.length);

    return `${fetchBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(key)}?alt=media`;
  } catch {
    return url;
  }
}

export function toDataUrl(image: InlineImage): string {
  return `data:${image.mimeType};base64,${image.base64}`;
}
