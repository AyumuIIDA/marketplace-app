import { DomainError } from "../../../shared/index.js";
export class HumanSignature {
    props;
    constructor(props) {
        this.props = props;
    }
    static createValid(input) {
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
    static rehydrate(props) {
        return new HumanSignature({ ...props });
    }
    get id() {
        return this.props.id;
    }
    get userId() {
        return this.props.userId;
    }
    get status() {
        return this.props.status;
    }
    get snapshot() {
        return { ...this.props };
    }
    revoke(now) {
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
export function validatePayloadHash(payloadHash) {
    if (!payloadHash.startsWith("sha256:")) {
        throw new DomainError("HUMAN_SIGNATURE_PAYLOAD_HASH_INVALID", "Payload hash must use sha256 format.", {
            payloadHash,
        });
    }
}
function validateRequiredText(field, value) {
    if (value.trim().length === 0) {
        throw new DomainError("HUMAN_SIGNATURE_FIELD_REQUIRED", `${field} is required.`, { field });
    }
}
