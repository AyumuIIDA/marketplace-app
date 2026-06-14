import { describe, expect, it } from "vitest";

import type { GetListingUseCase } from "../../modules/listings/index.js";
import {
  CompareListingsUseCase,
  type CompareListingsInput,
} from "../../modules/agents/index.js";
import { DeterministicAiAssistant } from "../../modules/agents/infrastructure/index.js";

import { CompareListingsWorkflow } from "./compare-listings.workflow.js";

describe("CompareListingsWorkflow", () => {
  it("fetches each listing with the requester and forwards summaries to the AI", async () => {
    const requested: Array<{ listingId: string; requesterId?: string }> = [];
    let comparedInput: CompareListingsInput | undefined;

    const getListingUseCase = {
      execute: async (input: { listingId: string; requesterId?: string }) => {
        requested.push(input);

        return {
          listingId: input.listingId,
          sellerId: "seller-1",
          title: `Title ${input.listingId}`,
          description: "desc",
          price: input.listingId === "listing-2" ? 3000 : 5000,
          currency: "JPY",
          category: "general",
          condition: "good",
          status: "PUBLISHED",
        };
      },
    } as unknown as GetListingUseCase;

    // AI比較は決定論fakeをラップして実挙動で検証しつつ、入力をキャプチャする。
    const inner = new CompareListingsUseCase({ aiAssistant: new DeterministicAiAssistant() });
    const compareListingsUseCase = {
      execute: async (input: CompareListingsInput) => {
        comparedInput = input;

        return inner.execute(input);
      },
    } as unknown as CompareListingsUseCase;

    const workflow = new CompareListingsWorkflow({ getListingUseCase, compareListingsUseCase });

    const result = await workflow.execute({
      listingIds: ["listing-1", "listing-2"],
      requesterId: "user-1",
    });

    // 全listingがrequesterId付きで取得される（閲覧権限ゲートのため）。
    expect(requested).toEqual([
      { listingId: "listing-1", requesterId: "user-1" },
      { listingId: "listing-2", requesterId: "user-1" },
    ]);
    // ListingOutput.listingId が ComparableListing.listingId へ正しく写像される。
    expect(comparedInput?.listings.map((l) => l.listingId)).toEqual(["listing-1", "listing-2"]);
    expect(comparedInput?.listings[1]?.price).toBe(3000);
    expect(result.items).toHaveLength(2);
  });
});
