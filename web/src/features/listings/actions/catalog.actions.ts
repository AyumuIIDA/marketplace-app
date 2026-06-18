"use server";

import { searchListings } from "../../../lib/api/listings.api";
import type { ListingViewModel } from "../listing-view-model";
import { mapListingsToViewModels } from "../listing.mapper";

// カテゴリ表示の Load more。offset で次ページを取得する（backendページネーション）。
export async function loadMoreListingsAction(input: {
  keyword?: string;
  category: string;
  offset: number;
  limit: number;
}): Promise<ListingViewModel[]> {
  const items = await searchListings({
    keyword: input.keyword,
    category: input.category,
    limit: input.limit,
    offset: input.offset,
  });

  return mapListingsToViewModels(items);
}
