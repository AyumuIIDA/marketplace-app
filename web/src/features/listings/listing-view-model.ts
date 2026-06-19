import type { Listing } from "../../lib/api/listings.api";

export type ListingViewModel = {
  id: string;
  title: string;
  price: number;
  priceLabel: string;
  currency: "JPY";
  category: string;
  sellerId: string;
  // 出品者が人間認証済みか。Seal(認証マーク)の表示判定に使う（アカウント認証が正本）。
  sellerVerified: boolean;
  status: Listing["status"];
  createdAt: string;
  imageUrl?: string;
  // 現在のユーザーがこの出品をいいね済みか（初期表示のhydrate用）。
  liked: boolean;
  likeCount: number;
  commentCount: number;
};
