import { DomainError } from "../../../shared/index.js";

import type { SignatureAction } from "./signature-action.type.js";
import type { SignatureResource } from "./signature-resource.type.js";
import type { SignatureStatus } from "./signature-status.type.js";

export type HumanSignatureProps = {
  id: string;
  userId: string;
  actionType: SignatureAction;
  resourceType: SignatureResource;
  resourceId: string;
  payloadHash: string;
  signatureFormat: "JWS";
  signatureValue: string;
  worldIdVerificationId: string;
  status: SignatureStatus;
  signedAt: Date;
  revokedAt?: Date;
};

export type CreateHumanSignatureProps = {
  id: string;
  userId: string;
  actionType: SignatureAction;
  resourceType: SignatureResource;
  resourceId: string;
  payloadHash: string;
  signatureValue: string;
  worldIdVerificationId: string;
  signedAt: Date;
};

export class HumanSignature {
  private constructor(private props: HumanSignatureProps) {}

  static createValid(input: CreateHumanSignatureProps): HumanSignature {
    validateRequiredText("userId", input.userId);
    validateRequiredText("resourceId", input.resourceId);
    validateRequiredText("payloadHash", input.payloadHash);
    validateRequiredText("signatureValue", input.signatureValue);
    validateRequiredText("worldIdVerificationId", input.worldIdVerificationId);
    validatePayloadHash(input.payloadHash);

    return new HumanSignature({
      id: input.id,
      userId: input.userId,
      actionType: input.actionType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      payloadHash: input.payloadHash,
      signatureFormat: "JWS",
      signatureValue: input.signatureValue,
      worldIdVerificationId: input.worldIdVerificationId,
      status: "VALID",
      signedAt: input.signedAt,
    });
  }

  static rehydrate(props: HumanSignatureProps): HumanSignature {
    return new HumanSignature({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get status(): SignatureStatus {
    return this.props.status;
  }

  get snapshot(): HumanSignatureProps {
    return { ...this.props };
  }

  revoke(now: Date): void {
    if (this.props.status === "REVOKED") {
      throw new DomainError("HUMAN_SIGNATURE_ALREADY_REVOKED", "Human signature is already revoked.", {
        signatureId: this.props.id,
      });
    }

    this.props = {
      ...this.props,
      status: "REVOKED",
      revokedAt: now,
    };
  }
}

export function validatePayloadHash(payloadHash: string): void {
  if (!payloadHash.startsWith("sha256:")) {
    throw new DomainError("HUMAN_SIGNATURE_PAYLOAD_HASH_INVALID", "Payload hash must use sha256 format.", {
      payloadHash,
    });
  }
}

function validateRequiredText(field: string, value: string): void {
  if (value.trim().length === 0) {
    throw new DomainError("HUMAN_SIGNATURE_FIELD_REQUIRED", `${field} is required.`, { field });
  }
}

