import { getTranslations } from "next-intl/server";

import type { ListingViewModel } from "../listing-view-model";
import { ListingCard } from "./listing-card";

type ListingGridProps = {
  listings: ListingViewModel[];
  // 非PUBLISHEDの出品は閲覧不可（非出品者には403）なので、カードのリンクを無効化する。
  // いいねタブ専用。既定では通常どおりリンクする（出品者本人の下書き/売却済は閲覧可のため）。
  blockUnviewable?: boolean;
};

// 均一グリッド。恣意的な featured span は廃止し、価格比較しやすい等幅カードに統一。
export async function ListingGrid({ listings, blockUnviewable = false }: ListingGridProps) {
  const [seal, catalog, social] = await Promise.all([
    getTranslations("seal"),
    getTranslations("catalog"),
    getTranslations("social"),
  ]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {listings.map((item) => (
        <ListingCard
          blockUnviewable={blockUnviewable}
          draftLabel={catalog("draft")}
          hiddenLabel={catalog("withdrawn")}
          item={item}
          key={item.id}
          likeLabel={social("likeItem")}
          saveLabel={social("saveItem")}
          signedLabel={seal("humanSigned")}
          soldLabel={catalog("sold")}
          unavailableLabel={social("unavailable")}
        />
      ))}
    </div>
  );
}
