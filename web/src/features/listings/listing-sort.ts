import type { ListingViewModel } from "./listing-view-model";

// 並び順はサーバ側で確定する（一覧クエリの ORDER BY）。ここでは型と選択肢、URL パラメータの解釈だけを持つ。
// shuffle=おすすめ（seed付き決定的シャッフル・既定）/ newest / popular（いいね順）/ commented（コメント数順）/ 価格。
export type ListingSort = "shuffle" | "newest" | "popular" | "commented" | "priceAsc" | "priceDesc";

export const LISTING_SORTS: ListingSort[] = ["shuffle", "newest", "popular", "commented", "priceAsc", "priceDesc"];

// 既定は shuffle（セッション内一貫のおすすめ順）。未知値もここに畳む。
export const DEFAULT_LISTING_SORT: ListingSort = "shuffle";

export function parseListingSort(value: string | undefined): ListingSort {
  return LISTING_SORTS.includes(value as ListingSort) ? (value as ListingSort) : DEFAULT_LISTING_SORT;
}

export type CategoryGroup = {
  category: string;
  items: ListingViewModel[];
};

// カテゴリで分割する。各グループ内の順序はサーバが返した並び順をそのまま保つ（再ソートしない）。
// グループ自体は件数の多いカテゴリを上に出す（ホームの注目セクションの見せ方）。
export function groupByCategory(items: ListingViewModel[]): CategoryGroup[] {
  const byCategory = new Map<string, ListingViewModel[]>();

  for (const item of items) {
    const current = byCategory.get(item.category) ?? [];
    current.push(item);
    byCategory.set(item.category, current);
  }

  return [...byCategory.entries()]
    .map(([category, list]) => ({ category, items: list }))
    .sort((a, b) => b.items.length - a.items.length || a.category.localeCompare(b.category));
}
