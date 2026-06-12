import { assertSignalHashBindsPayload, assertWorldIdMatchesAction, } from "./world-id-verification.assertion.js";
// VerifiedHumanPresenceの唯一の生成口。export しないことでmodule外からの構築を封じる。
function toVerifiedHumanPresence(value) {
    return value;
}
export class HumanSignatureApplicationService {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async verifyHumanPresence(input) {
        const verificationResult = await this.deps.worldIdVerifier.verify({
            idKitResult: input.idKitResult,
        });
        if (!verificationResult.ok) {
            throw verificationResult.error;
        }
        assertWorldIdMatchesAction({
            verifiedWorldId: verificationResult.value,
            expectedAction: input.expectedAction,
            expectedEnvironment: input.expectedEnvironment,
        });
        return toVerifiedHumanPresence(verificationResult.value);
    }
    async recordSignature(input, context) {
        assertSignalHashBindsPayload({
            actualSignalHash: input.presence.signalHash,
            expectedSignalHash: input.expectedSignalHash,
        });
        return this.deps.humanSignatureCreator.create({
            userId: input.userId,
            actionType: input.actionType,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            payloadHash: input.payloadHash,
            verifiedWorldId: input.presence,
        }, context);
    }
}
