import { bffJson, isBffError } from "./bff-client";

// いいねトグルの応答。backend social module: POST/DELETE /listings/:id/like, /sellers/:id/like。
export type LikeStatus = {
  likeCount: number;
  likedByMe: boolean;
};

// 現在のユーザーがいいね済みの出品ID集合。出品カード/詳細の初期いいね状態(hydrate)に使う。
// 未ログインなどで取得できなければ空集合（＝未いいね扱い）。
export async function getLikedListingIds(limit = 100): Promise<Set<string>> {
  try {
    const out = await bffJson<{ items: { listingId: string }[] }>(`/me/liked-listings?limit=${limit}`);
    return new Set(out.items.map((item) => item.listingId));
  } catch (error) {
    if (isBffError(error) && (error.status === 401 || error.status === 404)) {
      return new Set();
    }
    throw error;
  }
}

// 出品いいね。liked=true で POST（いいね）、false で DELETE（解除）。
export async function setListingLike(listingId: string, liked: boolean): Promise<LikeStatus> {
  return bffJson<LikeStatus>(`/listings/${listingId}/like`, { method: liked ? "POST" : "DELETE" });
}

// 出品者いいね。
export async function setSellerLike(sellerId: string, liked: boolean): Promise<LikeStatus> {
  return bffJson<LikeStatus>(`/sellers/${sellerId}/like`, { method: liked ? "POST" : "DELETE" });
}
