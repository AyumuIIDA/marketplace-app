import { SegmentedFilter } from "../../../components/ui/segmented-filter";
import type { ListingViewModel } from "../listing-view-model";
import { ListingGrid } from "./listing-grid";

type FeaturedCatalogSectionProps = {
  listings: ListingViewModel[];
};

export function FeaturedCatalogSection({ listings }: FeaturedCatalogSectionProps) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-neutral-500">Available items</h2>
        <SegmentedFilter
          options={[
            { label: "All", active: true },
            { label: "Verified" },
            { label: "New" },
          ]}
        />
      </div>

      <ListingGrid listings={listings} />
    </section>
  );
}
