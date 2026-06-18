import type { ListingViewModel } from "./listing-view-model";

export type ListingSort = "newest" | "priceAsc" | "priceDesc";

export const LISTING_SORTS: ListingSort[] = ["newest", "priceAsc", "priceDesc"];

export function parseListingSort(value: string | undefined): ListingSort {
  return value === "priceAsc" || value === "priceDesc" || value === "newest" ? value : "newest";
}

export function sortListings(items: ListingViewModel[], sort: ListingSort): ListingViewModel[] {
  const copy = [...items];

  if (sort === "priceAsc") {
    copy.sort((a, b) => a.price - b.price);
  } else if (sort === "priceDesc") {
    copy.sort((a, b) => b.price - a.price);
  } else {
    // newest first（createdAt は ISO 文字列なので辞書順比較で時刻順になる）。
    copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return copy;
}

// 取得済み集合に含まれるカテゴリ一覧（重複排除・名前順）。カテゴリ選択肢に使う。
// 後でbackend側のファセット/カテゴリ一覧APIに差し替え予定。
export function distinctCategories(items: ListingViewModel[]): string[] {
  return [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b));
}

export type CategoryGroup = {
  category: string;
  items: ListingViewModel[];
};

// カテゴリで分割し、各グループ内を sort で並べ替える。件数の多いカテゴリを上に。
export function groupByCategory(items: ListingViewModel[], sort: ListingSort): CategoryGroup[] {
  const byCategory = new Map<string, ListingViewModel[]>();

  for (const item of items) {
    const current = byCategory.get(item.category) ?? [];
    current.push(item);
    byCategory.set(item.category, current);
  }

  return [...byCategory.entries()]
    .map(([category, list]) => ({ category, items: sortListings(list, sort) }))
    .sort((a, b) => b.items.length - a.items.length || a.category.localeCompare(b.category));
}
