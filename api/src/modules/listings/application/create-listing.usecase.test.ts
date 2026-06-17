import { describe, expect, it } from "vitest";

import { FixedClock, FixedIdGenerator } from "../../../shared/index.js";
import type {
  Listing,
  ListingRepository,
  SaveListingImagesInput,
  SearchListingsInput,
} from "../domain/index.js";

import { CreateListingUseCase } from "./create-listing.usecase.js";

class FakeListingRepository implements ListingRepository {
  readonly listings = new Map<string, Listing>();
  readonly savedImages = new Map<string, SaveListingImagesInput["images"]>();

  async save(listing: Listing): Promise<void> {
    this.listings.set(listing.id, listing);
  }

  async saveImages(input: SaveListingImagesInput): Promise<void> {
    this.savedImages.set(input.listingId, input.images);
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
    return [...this.listings.values()].slice(0, input.limit ?? 50);
  }
}

describe("CreateListingUseCase", () => {
  it("should create and persist a draft listing", async () => {
    const listingRepository = new FakeListingRepository();
    const useCase = new CreateListingUseCase({
      listingRepository,
      idGenerator: new FixedIdGenerator(["listing_1"]),
      clock: new FixedClock(new Date("2026-06-09T00:00:00.000Z")),
    });

    const output = await useCase.execute({
      sellerId: "seller_1",
      title: "Sneakers",
      description: "Used a few times.",
      price: 7800,
      category: "fashion_shoes",
      condition: "good",
    });

    const persisted = await listingRepository.findById(output.listingId);

    expect(output).toEqual({
      listingId: "listing_1",
      status: "DRAFT",
    });
    expect(persisted?.snapshot).toMatchObject({
      id: "listing_1",
      sellerId: "seller_1",
      status: "DRAFT",
      title: "Sneakers",
      price: 7800,
    });
  });

  it("should persist attached images when provided", async () => {
    const listingRepository = new FakeListingRepository();
    const useCase = new CreateListingUseCase({
      listingRepository,
      idGenerator: new FixedIdGenerator(["listing_1"]),
      clock: new FixedClock(new Date("2026-06-09T00:00:00.000Z")),
    });

    const output = await useCase.execute({
      sellerId: "seller_1",
      title: "Sneakers",
      description: "Used a few times.",
      price: 7800,
      category: "fashion_shoes",
      condition: "good",
      images: [
        { url: "http://storage/marketplace-images/listings/abc.jpg", hash: "abc", sortOrder: 0 },
      ],
    });

    expect(listingRepository.savedImages.get(output.listingId)).toEqual([
      { url: "http://storage/marketplace-images/listings/abc.jpg", hash: "abc", sortOrder: 0 },
    ]);
  });

  it("should not persist images when none are provided", async () => {
    const listingRepository = new FakeListingRepository();
    const useCase = new CreateListingUseCase({
      listingRepository,
      idGenerator: new FixedIdGenerator(["listing_1"]),
      clock: new FixedClock(new Date("2026-06-09T00:00:00.000Z")),
    });

    const output = await useCase.execute({
      sellerId: "seller_1",
      title: "Sneakers",
      description: "Used a few times.",
      price: 7800,
      category: "fashion_shoes",
      condition: "good",
    });

    expect(listingRepository.savedImages.has(output.listingId)).toBe(false);
  });
});
