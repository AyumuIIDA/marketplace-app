import { DomainError } from "../../../shared/index.js";
export class User {
    props;
    constructor(props) {
        this.props = props;
    }
    static create(input) {
        validateUserText("displayName", input.displayName);
        validateEmail(input.email);
        return new User({
            id: input.id,
            displayName: input.displayName,
            email: input.email,
            avatarUrl: input.avatarUrl,
            status: "ACTIVE",
            createdAt: input.now,
            updatedAt: input.now,
        });
    }
    static rehydrate(props) {
        return new User({ ...props });
    }
    get id() {
        return this.props.id;
    }
    get status() {
        return this.props.status;
    }
    get snapshot() {
        return { ...this.props };
    }
    updateProfile(input) {
        validateUserText("displayName", input.displayName);
        this.props = {
            ...this.props,
            displayName: input.displayName,
            avatarUrl: input.avatarUrl,
            updatedAt: input.now,
        };
    }
    suspend(now) {
        this.props = {
            ...this.props,
            status: "SUSPENDED",
            updatedAt: now,
        };
    }
}
export function validateUserText(field, value) {
    if (value.trim().length === 0) {
        throw new DomainError("USER_FIELD_REQUIRED", `${field} is required.`, { field });
    }
}
export function validateEmail(email) {
    if (!email.includes("@") || email.trim().length === 0) {
        throw new DomainError("USER_EMAIL_INVALID", "User email is invalid.", { email });
    }
}
