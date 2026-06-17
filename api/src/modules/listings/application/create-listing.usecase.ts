import type { Clock, IdGenerator } from "../../../shared/index.js";
import { Listing, type ListingRepository } from "../domain/index.js";

export type CreateListingInput = {
  sellerId: string;
  agentId?: string;
  title: string;
  description: string;
  price: number;
  currency?: "JPY";
  category: string;
  condition: string;
  // アップロード済み画像の参照（POST /listings/images で先行アップロード済み）。
  images?: { url: string; hash: string; sortOrder: number }[];
};

export type CreateListingOutput = {
  listingId: string;
  status: "DRAFT";
};

export type CreateListingDeps = {
  listingRepository: ListingRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class CreateListingUseCase {
  constructor(private readonly deps: CreateListingDeps) {}

  async execute(input: CreateListingInput): Promise<CreateListingOutput> {
    const listing = Listing.createDraft({
      id: this.deps.idGenerator.newId(),
      sellerId: input.sellerId,
      agentId: input.agentId,
      title: input.title,
      description: input.description,
      price: input.price,
      currency: input.currency,
      category: input.category,
      condition: input.condition,
      now: this.deps.clock.now(),
    });

    await this.deps.listingRepository.save(listing);

    if (input.images !== undefined && input.images.length > 0) {
      await this.deps.listingRepository.saveImages({
        listingId: listing.id,
        images: input.images,
      });
    }

    return {
      listingId: listing.id,
      status: "DRAFT",
    };
  }
}
