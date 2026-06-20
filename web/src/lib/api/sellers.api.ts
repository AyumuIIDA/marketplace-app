import { bffJson, isBffError } from "./bff-client";

// 出品者サマリ。出品者UI（名前・本人確認・評価・いいね）の表示元。
// backend: GET /sellers/:id（social module）。displayName/humanVerified は users 由来の実値。
export type SellerSummary = {
  sellerId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  humanVerified: boolean;
  rating?: number;
  reviewCount: number;
  likeCount: number;
  likedByMe: boolean;
  // 私的フォロー（認証不要）。いいね（公開・認証必須）とは別レイヤー。
  followingByMe: boolean;
};

// backend応答（rating は未評価時 null）。UI型に正規化して返す。
type SellerSummaryResponse = Omit<SellerSummary, "rating"> & { rating: number | null };

export async function getSellerSummary(sellerId: string): Promise<SellerSummary> {
  try {
    const raw = await bffJson<SellerSummaryResponse>(`/sellers/${sellerId}`);
    return { ...raw, rating: raw.rating ?? undefined };
  } catch (error) {
    // 取得不能(未ログイン/不在)でもカードは描画する。ID由来の最小情報にフォールバック。
    if (isBffError(error) && (error.status === 401 || error.status === 404)) {
      const handle = `@${sellerId.slice(0, 8)}`;
      return { sellerId, handle, displayName: handle, humanVerified: false, reviewCount: 0, likeCount: 0, likedByMe: false, followingByMe: false };
    }
    throw error;
  }
}
