"use server";

import { setListingLike, setSellerLike, type LikeStatus } from "../../../lib/api/social.api";

// いいねトグルの server action。client の LikeButton から bind して呼ぶ
// （例: toggleListingLikeAction.bind(null, listingId)）。応答の {likeCount, likedByMe} を返す。
export async function toggleListingLikeAction(listingId: string, liked: boolean): Promise<LikeStatus> {
  return setListingLike(listingId, liked);
}

export async function toggleSellerLikeAction(sellerId: string, liked: boolean): Promise<LikeStatus> {
  return setSellerLike(sellerId, liked);
}
