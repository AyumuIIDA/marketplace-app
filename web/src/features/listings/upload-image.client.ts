// 商品画像アップロード（クライアント直）。ブラウザ → BFF(/api/bff) → API → ObjectStorage。
// multipartはBFF proxyがそのまま透過する。cookie/Originはブラウザが自動付与し、
// BFFがAuth.jsセッションを検証してからAPIへ内部トークンで転送する（API直叩きは不可）。
export type UploadedImage = {
  url: string;
  aiUrl?: string;
  hash: string;
};

export async function uploadListingImage(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/bff/listings/images", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Image upload failed (${response.status}).`);
  }

  return (await response.json()) as UploadedImage;
}
