import { SegmentedFilter } from "../../../components/ui/segmented-filter";
import type { ListingViewModel } from "../listing-view-model";
import { ListingGrid } from "./listing-grid";

type FeaturedCatalogSectionProps = {
  listings: ListingViewModel[];
};

export function FeaturedCatalogSection({ listings }: FeaturedCatalogSectionProps) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-500">Featured catalog</h2>
        <SegmentedFilter
          options={[
            { label: "All", active: true },
            { label: "Human" },
            { label: "New" },
          ]}
        />
      </div>

      <ListingGrid listings={listings} />
    </section>
  );
}
