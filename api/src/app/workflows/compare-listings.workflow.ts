import { GetListingUseCase } from "../../modules/listings/index.js";
import {
  CompareListingsUseCase,
  type CompareListingsResult,
} from "../../modules/ai-assistance/index.js";
import type { Uuid } from "../../shared/index.js";

export type CompareListingsWorkflowInput = {
  listingIds: Uuid[];
  requesterId: string;
};

export type CompareListingsOperation = {
  execute(input: CompareListingsWorkflowInput): Promise<CompareListingsResult>;
};

export type CompareListingsWorkflowDeps = {
  getListingUseCase: GetListingUseCase;
  compareListingsUseCase: CompareListingsUseCase;
};

// listings(取得)とagents(AI比較)をまたぐread-only合成。トランザクション不要。
// 取得時にrequesterIdを渡すため、閲覧不可の下書きはGetListingUseCase側で弾かれる。
export class CompareListingsWorkflow implements CompareListingsOperation {
  constructor(private readonly deps: CompareListingsWorkflowDeps) {}

  async execute(input: CompareListingsWorkflowInput): Promise<CompareListingsResult> {
    const listings = await Promise.all(
      input.listingIds.map((listingId) =>
        this.deps.getListingUseCase.execute({ listingId, requesterId: input.requesterId }),
      ),
    );

    return this.deps.compareListingsUseCase.execute({
      listings: listings.map((listing) => ({
        listingId: listing.listingId,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        currency: listing.currency,
        condition: listing.condition,
        category: listing.category,
      })),
    });
  }
}
