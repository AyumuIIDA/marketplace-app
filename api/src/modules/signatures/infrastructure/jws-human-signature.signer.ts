import { createHmac, timingSafeEqual } from "node:crypto";

import { AppError, InfrastructureError, err, ok, type Result } from "../../../shared/index.js";
import type {
  HumanSignatureSigner,
  HumanSignatureVerifier,
  SignHumanSignatureInput,
  SignHumanSignatureOutput,
  VerifyHumanSignatureInput,
  VerifyHumanSignatureOutput,
} from "../application/index.js";

type JwsHumanSignatureConfig = {
  issuer: string;
  secret: string;
};

type JwsHeader = {
  alg: "HS256";
  typ: "JWT";
};

type HumanSignatureClaims = {
  iss: string;
  sub: string;
  jti: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  payload_hash: string;
  world_id_verification_id: string;
  iat: number;
};

export class JwsHumanSignatureSigner implements HumanSignatureSigner, HumanSignatureVerifier {
  constructor(private readonly config: JwsHumanSignatureConfig) {
    if (config.secret.trim().length === 0) {
      throw new InfrastructureError("JWS secret is required.");
    }
  }

  async sign(input: SignHumanSignatureInput): Promise<Result<SignHumanSignatureOutput, AppError>> {
    try {
      const header: JwsHeader = {
        alg: "HS256",
        typ: "JWT",
      };
      const claims: HumanSignatureClaims = {
        iss: this.config.issuer,
        sub: input.userId,
        jti: input.signatureId,
        action_type: input.actionType,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        payload_hash: input.payloadHash,
        world_id_verification_id: input.worldIdVerificationId,
        iat: Math.floor(input.issuedAt.getTime() / 1000),
      };
      const protectedHeader = encodeJson(header);
      const payload = encodeJson(claims);
      const signingInput = `${protectedHeader}.${payload}`;
      const signature = signHs256(signingInput, this.config.secret);

      return ok({
        signatureValue: `${signingInput}.${signature}`,
        signedAt: input.issuedAt,
      });
    } catch (error: unknown) {
      return err(toInfrastructureError(error, "Failed to sign human signature JWS."));
    }
  }

  async verify(input: VerifyHumanSignatureInput): Promise<Result<VerifyHumanSignatureOutput, AppError>> {
    try {
      const parts = input.signatureValue.split(".");

      if (parts.length !== 3) {
        return err(new AppError("JWS_INVALID", "Human signature JWS must use compact serialization.", 400));
      }

      const [protectedHeader, payload, signature] = parts;
      const expectedSignature = signHs256(`${protectedHeader}.${payload}`, this.config.secret);

      if (!constantTimeEquals(signature, expectedSignature)) {
        return err(new AppError("JWS_SIGNATURE_INVALID", "Human signature JWS signature is invalid.", 400));
      }

      const header = decodeJson<JwsHeader>(protectedHeader);
      const claims = decodeJson<HumanSignatureClaims>(payload);

      if (header.alg !== "HS256" || header.typ !== "JWT") {
        return err(new AppError("JWS_HEADER_INVALID", "Human signature JWS header is invalid.", 400));
      }

      if (!matchesExpectedClaims(claims, input, this.config.issuer)) {
        return err(new AppError("JWS_CLAIMS_INVALID", "Human signature JWS claims are invalid.", 400));
      }

      return ok({ valid: true });
    } catch (error: unknown) {
      return err(toInfrastructureError(error, "Failed to verify human signature JWS."));
    }
  }
}

function encodeJson(value: JwsHeader | HumanSignatureClaims): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function signHs256(signingInput: string, secret: string): string {
  return createHmac("sha256", secret).update(signingInput).digest("base64url");
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function matchesExpectedClaims(
  claims: HumanSignatureClaims,
  input: VerifyHumanSignatureInput,
  issuer: string,
): boolean {
  return (
    claims.iss === issuer &&
    claims.sub === input.userId &&
    claims.jti === input.signatureId &&
    claims.action_type === input.actionType &&
    claims.resource_type === input.resourceType &&
    claims.resource_id === input.resourceId &&
    claims.payload_hash === input.payloadHash &&
    claims.world_id_verification_id === input.worldIdVerificationId
  );
}

function toInfrastructureError(error: unknown, fallbackMessage: string): InfrastructureError {
  if (error instanceof InfrastructureError) {
    return error;
  }

  if (error instanceof Error) {
    return new InfrastructureError(fallbackMessage, { cause: error.message });
  }

  return new InfrastructureError(fallbackMessage);
}

