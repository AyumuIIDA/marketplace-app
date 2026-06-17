import { describe, expect, it } from "vitest";

import { AuthorizationError, FixedClock, type Uuid } from "../../../shared/index.js";
import { Listing, type ListingRepository, type SearchListingsInput } from "../domain/index.js";

import { GetListingUseCase } from "./get-listing.usecase.js";
import { SearchListingsUseCase } from "./search-listings.usecase.js";
import { UpdateDraftListingUseCase } from "./update-draft-listing.usecase.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");
// GetListingUseCase の入力は branded Uuid。fixtureのidも実uuidに揃える。
const LISTING_ID = "00000000-0000-4000-8000-000000000001" as Uuid;

describe("Listing query use cases", () => {
  it("should allow anyone to get a published listing", async () => {
    const listingRepository = new FakeListingRepository();
    const listing = createDraftListing();
    listing.publish("signature-1", fixedNow);
    await listingRepository.save(listing);
    const useCase = new GetListingUseCase({ listingRepository });

    const output = await useCase.execute({
      listingId: LISTING_ID,
      requesterId: "buyer-1",
    });

    expect(output).toMatchObject({
      listingId: LISTING_ID,
      status: "PUBLISHED",
    });
  });

  it("should hide a draft listing from non-sellers", async () => {
    const listingRepository = new FakeListingRepository();
    await listingRepository.save(createDraftListing());
    const useCase = new GetListingUseCase({ listingRepository });

    await expect(
      useCase.execute({
        listingId: LISTING_ID,
        requesterId: "buyer-1",
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it("should search published listings", async () => {
    const listingRepository = new FakeListingRepository();
    const listing = createDraftListing();
    listing.publish("signature-1", fixedNow);
    await listingRepository.save(listing);
    const useCase = new SearchListingsUseCase({ listingRepository });

    const output = await useCase.execute({
      keyword: "Sneakers",
    });

    expect(output.items).toHaveLength(1);
    expect(output.items[0]?.listingId).toBe(LISTING_ID);
  });

  it("should update a draft listing", async () => {
    const listingRepository = new FakeListingRepository();
    await listingRepository.save(createDraftListing());
    const useCase = new UpdateDraftListingUseCase({
      listingRepository,
      clock: new FixedClock(fixedNow),
    });

    const output = await useCase.execute({
      listingId: LISTING_ID,
      sellerId: "seller-1",
      fields: {
        title: "Updated Draft",
        description: "Updated description.",
        price: 9000,
        currency: "JPY",
        category: "fashion_shoes",
        condition: "good",
      },
    });

    expect(output).toMatchObject({
      listingId: LISTING_ID,
      title: "Updated Draft",
      status: "DRAFT",
    });
  });
});

function createDraftListing(): Listing {
  return Listing.createDraft({
    id: LISTING_ID,
    sellerId: "seller-1",
    title: "Sneakers",
    description: "Used a few times.",
    price: 7800,
    category: "fashion_shoes",
    condition: "good",
    now: fixedNow,
  });
}

class FakeListingRepository implements ListingRepository {
  listings = new Map<string, Listing>();

  async saveImages(_input: { listingId: string; images: { url: string; hash: string; sortOrder: number }[] }): Promise<void> {}

  async save(listing: Listing): Promise<void> {
    this.listings.set(listing.id, listing);
  }

  async findById(listingId: string): Promise<Listing | undefined> {
    return this.listings.get(listingId);
  }

  async claimForPurchase(input: {
    listingId: string;
    buyerId: string;
    soldAt: Date;
  }): Promise<Listing | undefined> {
    const listing = this.listings.get(input.listingId);

    if (listing === undefined) {
      return undefined;
    }

    const snapshot = listing.snapshot;

    if (snapshot.status !== "PUBLISHED" || snapshot.sellerId === input.buyerId) {
      return undefined;
    }

    listing.markSold(input.soldAt);
    this.listings.set(listing.id, listing);

    return listing;
  }

  async search(input: SearchListingsInput): Promise<Listing[]> {
    return [...this.listings.values()].filter((listing) => {
      const snapshot = listing.snapshot;
      return (
        (input.status === undefined || snapshot.status === input.status) &&
        (input.keyword === undefined ||
          snapshot.title.includes(input.keyword) ||
          snapshot.description.includes(input.keyword))
      );
    });
  }
}
