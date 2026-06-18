import type { Listing } from "../../lib/api/listings.api";

export type ListingViewModel = {
  id: string;
  title: string;
  price: number;
  priceLabel: string;
  currency: "JPY";
  category: string;
  sellerId: string;
  signed: boolean;
  status: Listing["status"];
  createdAt: string;
  imageUrl?: string;
  // 現在のユーザーがこの出品をいいね済みか（初期表示のhydrate用）。
  liked: boolean;
  likeCount: number;
  commentCount: number;
};
