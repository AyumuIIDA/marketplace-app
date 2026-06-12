import { Listing } from "../domain/index.js";
export class CreateListingUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
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
        return {
            listingId: listing.id,
            status: "DRAFT",
        };
    }
}
