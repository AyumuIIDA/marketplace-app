import type { AppError, Result } from "../../../shared/index.js";
import type { SignatureAction, SignatureResource } from "../domain/index.js";

export type SignHumanSignatureInput = {
  signatureId: string;
  userId: string;
  actionType: SignatureAction;
  resourceType: SignatureResource;
  resourceId: string;
  payloadHash: string;
  worldIdVerificationId: string;
  issuedAt: Date;
};

export type SignHumanSignatureOutput = {
  signatureValue: string;
  signedAt: Date;
};

export interface HumanSignatureSigner {
  sign(input: SignHumanSignatureInput): Promise<Result<SignHumanSignatureOutput, AppError>>;
}

export type VerifyHumanSignatureInput = Omit<SignHumanSignatureInput, "issuedAt"> & {
  signatureValue: string;
};

export type VerifyHumanSignatureOutput = {
  valid: true;
};

export interface HumanSignatureVerifier {
  verify(input: VerifyHumanSignatureInput): Promise<Result<VerifyHumanSignatureOutput, AppError>>;
}
