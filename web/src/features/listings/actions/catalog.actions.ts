"use server";

import { searchListings } from "../../../lib/api/listings.api";
import { getLikedListingIds } from "../../../lib/api/social.api";
import type { ListingViewModel } from "../listing-view-model";
import { mapListingsToViewModels } from "../listing.mapper";

// カテゴリ表示の Load more。offset で次ページを取得する（backendページネーション）。
// sort/seed/signed を引き継ぎ、サーバ側の決定的な並び順でページが重複/欠落しないようにする。
export async function loadMoreListingsAction(input: {
  keyword?: string;
  category: string;
  offset: number;
  limit: number;
  sort?: string;
  seed?: string;
  signed?: boolean;
}): Promise<ListingViewModel[]> {
  const [items, likedIds] = await Promise.all([
    searchListings({
      keyword: input.keyword,
      category: input.category,
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
      seed: input.seed,
      signed: input.signed,
    }),
    getLikedListingIds(),
  ]);

  return mapListingsToViewModels(items, likedIds);
}
