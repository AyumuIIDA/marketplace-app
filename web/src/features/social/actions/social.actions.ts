"use server";

import { revalidatePath } from "next/cache";

import {
  createListingComment,
  setListingLike,
  setSellerLike,
  type LikeStatus,
  type ListingComment,
} from "../../../lib/api/social.api";

// いいねトグルの server action。client の LikeButton から bind して呼ぶ
// （例: toggleListingLikeAction.bind(null, listingId)）。応答の {likeCount, likedByMe} を返す。
export async function toggleListingLikeAction(listingId: string, liked: boolean): Promise<LikeStatus> {
  return setListingLike(listingId, liked);
}

export async function toggleSellerLikeAction(sellerId: string, liked: boolean): Promise<LikeStatus> {
  return setSellerLike(sellerId, liked);
}

// 出品コメント投稿。投稿後に詳細ページを再検証してスレッドを更新する。
export async function createListingCommentAction(listingId: string, body: string): Promise<ListingComment> {
  const comment = await createListingComment(listingId, body.trim());
  revalidatePath(`/listings/${listingId}`);
  return comment;
}
