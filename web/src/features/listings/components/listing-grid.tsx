import type { ListingViewModel } from "../listing-view-model";
import { ListingCard } from "./listing-card";

type ListingGridProps = {
  listings: ListingViewModel[];
};

export function ListingGrid({ listings }: ListingGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {listings.map((item, index) => (
        <ListingCard featured={index === 0 || index === 3} item={item} key={item.id} />
      ))}
    </div>
  );
}
