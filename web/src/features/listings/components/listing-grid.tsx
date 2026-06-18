import { getTranslations } from "next-intl/server";

import type { ListingViewModel } from "../listing-view-model";
import { ListingCard } from "./listing-card";

type ListingGridProps = {
  listings: ListingViewModel[];
};

// 均一グリッド。恣意的な featured span は廃止し、価格比較しやすい等幅カードに統一。
export async function ListingGrid({ listings }: ListingGridProps) {
  const [seal, catalog, social] = await Promise.all([
    getTranslations("seal"),
    getTranslations("catalog"),
    getTranslations("social"),
  ]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {listings.map((item) => (
        <ListingCard
          draftLabel={catalog("draft")}
          item={item}
          key={item.id}
          likeLabel={social("likeItem")}
          signedLabel={seal("humanSigned")}
          soldLabel={catalog("sold")}
        />
      ))}
    </div>
  );
}
