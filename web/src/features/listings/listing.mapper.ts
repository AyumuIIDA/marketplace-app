import type { Listing } from "../../lib/api/listings.api";
import { catalogItemFixtures } from "./fixtures/catalog-items.fixture";
import type { ListingViewModel } from "./listing-view-model";

export function mapListingToViewModel(listing: Listing, index: number): ListingViewModel {
  const fixture = catalogItemFixtures[index % catalogItemFixtures.length] ?? catalogItemFixtures[0];

  return {
    id: listing.listingId,
    brand: listing.category,
    title: listing.title,
    price: listing.price.toLocaleString("ja-JP"),
    currency: listing.currency,
    surface: fixture.surface,
    object: fixture.object,
    imageUrl: listing.images?.[0]?.url,
  };
}

export function mapListingsToViewModels(listings: Listing[]): ListingViewModel[] {
  return listings.map(mapListingToViewModel);
}
