import { ValidationAppError } from "../../../shared/index.js";
import { toListingOutput } from "./listing.presenter.js";
export class SearchListingsUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        if (input.minPrice !== undefined &&
            input.maxPrice !== undefined &&
            input.minPrice > input.maxPrice) {
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
        });
        return {
            items: listings.map(toListingOutput),
        };
    }
}
