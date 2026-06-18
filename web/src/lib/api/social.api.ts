import { bffJson } from "./bff-client";

// いいねトグルの応答。backend social module: POST/DELETE /listings/:id/like, /sellers/:id/like。
export type LikeStatus = {
  likeCount: number;
  likedByMe: boolean;
};

// 出品いいね。liked=true で POST（いいね）、false で DELETE（解除）。
export async function setListingLike(listingId: string, liked: boolean): Promise<LikeStatus> {
  return bffJson<LikeStatus>(`/listings/${listingId}/like`, { method: liked ? "POST" : "DELETE" });
}

// 出品者いいね。
export async function setSellerLike(sellerId: string, liked: boolean): Promise<LikeStatus> {
  return bffJson<LikeStatus>(`/sellers/${sellerId}/like`, { method: liked ? "POST" : "DELETE" });
}
