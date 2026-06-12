import {
  ListingPublicationService,
  computeListingPayloadHash,
  listingToSignaturePayload,
} from "../../modules/listings/index.js";
import type {
  HumanSignatureService,
  IdKitResult,
} from "../../modules/signatures/index.js";

import type { HumanSignatureWorkflowTransaction } from "./human-signature-workflow.transaction.js";

export type PublishListingWithHumanSignatureInput = {
  listingId: string;
  sellerId: string;
  idKitResult: IdKitResult;
  expectedEnvironment?: string;
};

export type PublishListingWithHumanSignatureOutput = {
  listingId: string;
  signatureId: string;
  worldIdVerificationId: string;
  verificationCount: number;
  status: "PUBLISHED";
};

export type PublishListingWithHumanSignatureOperation = {
  execute(
    input: PublishListingWithHumanSignatureInput,
  ): Promise<PublishListingWithHumanSignatureOutput>;
};

export type PublishListingWithHumanSignatureWorkflowDeps = {
  transaction: HumanSignatureWorkflowTransaction;
  listingPublicationService: ListingPublicationService;
  humanSignatureService: HumanSignatureService;
};

export class PublishListingWithHumanSignatureWorkflow
  implements PublishListingWithHumanSignatureOperation
{
  constructor(private readonly deps: PublishListingWithHumanSignatureWorkflowDeps) {}

  async execute(
    input: PublishListingWithHumanSignatureInput,
  ): Promise<PublishListingWithHumanSignatureOutput> {
    // Phase 1: World ID検証はtransactionの外。外部HTTPがtransactionへ取り込まれない。
    const presence = await this.deps.humanSignatureService.verifyHumanPresence({
      idKitResult: input.idKitResult,
      expectedAction: "LISTING_PUBLISH",
      expectedEnvironment: input.expectedEnvironment,
    });

    // Phase 2: DB読み取り・signal_hash束縛・署名永続化・状態変更のみtransaction境界内。
    return this.deps.transaction.run(async (context) => {
      const listing = await this.deps.listingPublicationService.getListingForSellerMutation(
        {
          listingId: input.listingId,
          sellerId: input.sellerId,
        },
        context,
      );
      const payloadHash = computeListingPayloadHash(listingToSignaturePayload(listing));
      const signature = await this.deps.humanSignatureService.recordSignature(
        {
          userId: input.sellerId,
          actionType: "LISTING_PUBLISH",
          resourceType: "LISTING",
          resourceId: input.listingId,
          payloadHash,
          expectedSignalHash: payloadHash,
          presence,
        },
        context,
      );

      const output = await this.deps.listingPublicationService.publishWithSignature(
        {
          listing,
          signatureId: signature.signatureId,
          signedAt: signature.signedAt,
        },
        context,
      );

      return {
        ...output,
        signatureId: signature.signatureId,
        worldIdVerificationId: signature.worldIdVerificationId,
        verificationCount: signature.verificationCount,
      };
    });
  }
}
