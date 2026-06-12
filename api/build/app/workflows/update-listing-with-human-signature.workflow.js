import { computeListingPayloadHash, } from "../../modules/listings/index.js";
export class UpdateListingWithHumanSignatureWorkflow {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        // Phase 1: World ID検証はtransactionの外。外部HTTPがtransactionへ取り込まれない。
        const presence = await this.deps.humanSignatureService.verifyHumanPresence({
            idKitResult: input.idKitResult,
            expectedAction: "LISTING_UPDATE",
            expectedEnvironment: input.expectedEnvironment,
        });
        // Phase 2: DB読み取り・signal_hash束縛・署名永続化・状態変更のみtransaction境界内。
        return this.deps.transaction.run(async (context) => {
            const listing = await this.deps.listingPublicationService.getListingForSellerMutation({
                listingId: input.listingId,
                sellerId: input.sellerId,
            }, context);
            const current = listing.snapshot;
            const payloadHash = computeListingPayloadHash({
                listingId: current.id,
                sellerId: current.sellerId,
                agentId: current.agentId,
                ...input.fields,
            });
            const signature = await this.deps.humanSignatureService.recordSignature({
                userId: input.sellerId,
                actionType: "LISTING_UPDATE",
                resourceType: "LISTING",
                resourceId: input.listingId,
                payloadHash,
                expectedSignalHash: payloadHash,
                presence,
            }, context);
            const output = await this.deps.listingPublicationService.updateWithSignature({
                listing,
                fields: input.fields,
                signatureId: signature.signatureId,
                signedAt: signature.signedAt,
            }, context);
            return {
                ...output,
                signatureId: signature.signatureId,
                worldIdVerificationId: signature.worldIdVerificationId,
                verificationCount: signature.verificationCount,
            };
        });
    }
}
