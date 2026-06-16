import { MarketplaceShell } from "../../../components/layout/marketplace-shell";
import { ActionButton } from "../../../components/ui/action-button";
import { FeaturedCatalogSection } from "../../listings/components/featured-catalog-section";
import type { ListingViewModel } from "../../listings/listing-view-model";

type MarketplaceHomeViewProps = {
  humanLabel: string;
  listings: ListingViewModel[];
  searchQuery?: string;
  userLabel: string;
};

export function MarketplaceHomeView({ humanLabel, listings, searchQuery, userLabel }: MarketplaceHomeViewProps) {
  return (
    <MarketplaceShell activeSection="catalog" humanLabel={humanLabel} searchQuery={searchQuery} userLabel={userLabel}>
      <div className="mb-6 flex flex-col gap-4 border-b border-neutral-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-normal text-neutral-950 md:text-4xl">
            {searchQuery === undefined ? "Listings" : `Search results for "${searchQuery}"`}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">{humanLabel}</p>
        </div>
        <div className="flex gap-2">
          <ActionButton href="/listings/new" variant="primary">
            Create listing
          </ActionButton>
        </div>
      </div>

      <FeaturedCatalogSection listings={listings} />
    </MarketplaceShell>
  );
}
