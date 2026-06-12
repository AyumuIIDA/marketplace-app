import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError, InfrastructureError, err, ok } from "../../../shared/index.js";
export class JwsHumanSignatureSigner {
    config;
    constructor(config) {
        this.config = config;
        if (config.secret.trim().length === 0) {
            throw new InfrastructureError("JWS secret is required.");
        }
    }
    async sign(input) {
        try {
            const header = {
                alg: "HS256",
                typ: "JWT",
            };
            const claims = {
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
        }
        catch (error) {
            return err(toInfrastructureError(error, "Failed to sign human signature JWS."));
        }
    }
    async verify(input) {
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
            const header = decodeJson(protectedHeader);
            const claims = decodeJson(payload);
            if (header.alg !== "HS256" || header.typ !== "JWT") {
                return err(new AppError("JWS_HEADER_INVALID", "Human signature JWS header is invalid.", 400));
            }
            if (!matchesExpectedClaims(claims, input, this.config.issuer)) {
                return err(new AppError("JWS_CLAIMS_INVALID", "Human signature JWS claims are invalid.", 400));
            }
            return ok({ valid: true });
        }
        catch (error) {
            return err(toInfrastructureError(error, "Failed to verify human signature JWS."));
        }
    }
}
function encodeJson(value) {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}
function decodeJson(value) {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}
function signHs256(signingInput, secret) {
    return createHmac("sha256", secret).update(signingInput).digest("base64url");
}
function constantTimeEquals(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
}
function matchesExpectedClaims(claims, input, issuer) {
    return (claims.iss === issuer &&
        claims.sub === input.userId &&
        claims.jti === input.signatureId &&
        claims.action_type === input.actionType &&
        claims.resource_type === input.resourceType &&
        claims.resource_id === input.resourceId &&
        claims.payload_hash === input.payloadHash &&
        claims.world_id_verification_id === input.worldIdVerificationId);
}
function toInfrastructureError(error, fallbackMessage) {
    if (error instanceof InfrastructureError) {
        return error;
    }
    if (error instanceof Error) {
        return new InfrastructureError(fallbackMessage, { cause: error.message });
    }
    return new InfrastructureError(fallbackMessage);
}
