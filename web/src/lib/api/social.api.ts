import { bffJson, isBffError } from "./bff-client";
import type { Listing } from "./listings.api";
import type { SellerSummary } from "./sellers.api";

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

// 現在のユーザーがいいね済みの出品「本体」を新着順で取得する（/me のいいねタブ用）。
// getLikedListingIds が ID だけ返すのに対し、こちらは検索と同じ ListingView をフルで返す。
// 未ログインなどで取得できなければ空配列。
export async function searchLikedListings(limit = 50): Promise<Listing[]> {
  try {
    const out = await bffJson<{ items: Listing[] }>(`/me/liked-listings?limit=${limit}`);
    return out.items;
  } catch (error) {
    if (isBffError(error) && (error.status === 401 || error.status === 404)) {
      return [];
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

// 現在のユーザーがいいね済みの出品者サマリを新着順で取得する（/me のいいねタブ用）。
// /me/liked-sellers は {items: SellerSummary[]}（rating は未評価時 null）。getSellerSummary と同様に正規化する。
// 未ログインなどで取得できなければ空配列。
export async function searchLikedSellers(limit = 50): Promise<SellerSummary[]> {
  try {
    const out = await bffJson<{ items: (Omit<SellerSummary, "rating"> & { rating: number | null })[] }>(
      `/me/liked-sellers?limit=${limit}`,
    );
    return out.items.map((seller) => ({ ...seller, rating: seller.rating ?? undefined }));
  } catch (error) {
    if (isBffError(error) && (error.status === 401 || error.status === 404)) {
      return [];
    }
    throw error;
  }
}

// 出品コメント。著者は本人認証済みのみ（backendで強制）。authorHumanVerified で認証バッジを出す。
export type ListingComment = {
  commentId: string;
  listingId: string;
  authorId: string;
  authorDisplayName: string;
  authorHumanVerified: boolean;
  body: string;
  createdAt: string;
};

export async function listListingComments(listingId: string, limit = 50): Promise<ListingComment[]> {
  try {
    const out = await bffJson<{ items: ListingComment[] }>(`/listings/${listingId}/comments?limit=${limit}`);
    return out.items;
  } catch (error) {
    // 未ログイン等で取得不可でもページは描画する。
    if (isBffError(error) && (error.status === 401 || error.status === 404)) {
      return [];
    }
    throw error;
  }
}

export async function createListingComment(listingId: string, body: string): Promise<ListingComment> {
  return bffJson<ListingComment>(`/listings/${listingId}/comments`, { method: "POST", body: { body } });
}
