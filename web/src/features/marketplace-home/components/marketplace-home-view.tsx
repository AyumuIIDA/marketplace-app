import { MarketplaceShell } from "../../../components/layout/marketplace-shell";
import { FeaturedCatalogSection } from "../../listings/components/featured-catalog-section";
import type { ListingViewModel } from "../../listings/listing-view-model";
import { HeroSearchPanel } from "./hero-search-panel";

type MarketplaceHomeViewProps = {
  humanLabel: string;
  listings: ListingViewModel[];
  userLabel: string;
};

export function MarketplaceHomeView({ humanLabel, listings, userLabel }: MarketplaceHomeViewProps) {
  return (
    <MarketplaceShell humanLabel={humanLabel} userLabel={userLabel}>
      <div className="mx-auto w-full max-w-4xl text-center">
        <p className="text-sm font-medium text-neutral-500">AI-assisted marketplace portal</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-normal text-neutral-950 md:text-7xl">
          What are you looking for?
        </h1>
      </div>

      <HeroSearchPanel />
      <FeaturedCatalogSection listings={listings} />
    </MarketplaceShell>
  );
}
