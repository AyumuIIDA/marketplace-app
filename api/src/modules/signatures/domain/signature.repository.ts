import type { SignatureAction } from "./signature-action.type.js";
import type { SignatureResource } from "./signature-resource.type.js";
import type { HumanSignature } from "./human-signature.entity.js";
import type { WorldIdVerification } from "./world-id-verification.entity.js";

export type FindValidHumanSignatureInput = {
  actionType: SignatureAction;
  resourceType: SignatureResource;
  resourceId: string;
  payloadHash: string;
};

export interface HumanSignatureRepository {
  save(signature: HumanSignature): Promise<void>;
  findValidByResourcePayload(input: FindValidHumanSignatureInput): Promise<HumanSignature | undefined>;
}

export interface WorldIdVerificationRepository {
  save(verification: WorldIdVerification): Promise<void>;
  countByUserAction(userId: string, action: string): Promise<number>;
}

