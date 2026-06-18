import { ValidationAppError } from "../../../shared/index.js";
import type { ListingRepository } from "../domain/index.js";

import { toListingOutput, type ListingOutput } from "./listing.presenter.js";

export type SearchListingsInput = {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sellerId?: string;
  includeDraftsForSeller?: boolean;
  limit?: number;
  offset?: number;
};

export type SearchListingsOutput = {
  items: ListingOutput[];
};

export type SearchListingsDeps = {
  listingRepository: ListingRepository;
};

export class SearchListingsUseCase {
  constructor(private readonly deps: SearchListingsDeps) {}

  async execute(input: SearchListingsInput): Promise<SearchListingsOutput> {
    if (
      input.minPrice !== undefined &&
      input.maxPrice !== undefined &&
      input.minPrice > input.maxPrice
    ) {
      throw new ValidationAppError("minPrice must be less than or equal to maxPrice.", {
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
      });
    }

    const listings = await this.deps.listingRepository.search({
      keyword: input.keyword,
      category: input.category,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      condition: input.condition,
      sellerId: input.sellerId,
      status: input.includeDraftsForSeller === true ? undefined : "PUBLISHED",
      limit: input.limit,
      offset: input.offset,
    });

    return {
      items: listings.map(toListingOutput),
    };
  }
}
