import { DomainError } from "../../../shared/index.js";
export class WorldIdVerification {
    props;
    constructor(props) {
        this.props = props;
    }
    static create(input) {
        validateRequiredText("userId", input.userId);
        validateRequiredText("action", input.action);
        validateRequiredText("nullifierHash", input.nullifierHash);
        validateRequiredText("verificationLevel", input.verificationLevel);
        validateRequiredText("environment", input.environment);
        return new WorldIdVerification({
            id: input.id,
            userId: input.userId,
            action: input.action,
            nullifierHash: input.nullifierHash,
            verificationLevel: input.verificationLevel,
            signalHash: input.signalHash,
            environment: input.environment,
            verifiedAt: input.verifiedAt,
            createdAt: input.now,
        });
    }
    static rehydrate(props) {
        return new WorldIdVerification({ ...props });
    }
    get id() {
        return this.props.id;
    }
    get userId() {
        return this.props.userId;
    }
    get action() {
        return this.props.action;
    }
    get snapshot() {
        return { ...this.props };
    }
}
function validateRequiredText(field, value) {
    if (value.trim().length === 0) {
        throw new DomainError("WORLD_ID_VERIFICATION_FIELD_REQUIRED", `${field} is required.`, {
            field,
        });
    }
}
