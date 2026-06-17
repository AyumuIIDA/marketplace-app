// LLMマルチモーダル入力のための画像取得ユーティリティ。
// 公開URL（local=fake-gcs / prod=GCS）からバイトを取得しbase64へ変換する。
// 外部I/O境界: 取得失敗は画像を落として継続し（テキストのみで生成）、提案全体は失敗させない。
export type InlineImage = {
  mimeType: string;
  base64: string;
};

export async function fetchInlineImages(urls: string[]): Promise<InlineImage[]> {
  if (urls.length === 0) {
    return [];
  }

  const results = await Promise.all(urls.map(fetchInlineImage));

  return results.filter((image): image is InlineImage => image !== undefined);
}

async function fetchInlineImage(url: string): Promise<InlineImage | undefined> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return undefined;
    }

    const mimeType = response.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");

    return { mimeType, base64 };
  } catch {
    // ネットワーク/ホスト到達不可など。画像なしで継続する。
    return undefined;
  }
}

export function toDataUrl(image: InlineImage): string {
  return `data:${image.mimeType};base64,${image.base64}`;
}
