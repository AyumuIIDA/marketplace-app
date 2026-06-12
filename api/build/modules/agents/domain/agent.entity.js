import { DomainError } from "../../../shared/index.js";
export class Agent {
    props;
    constructor(props) {
        this.props = props;
    }
    static create(input) {
        validateAgentName(input.name);
        return new Agent({
            id: input.id,
            userId: input.userId,
            name: input.name,
            status: "ACTIVE",
            createdAt: input.now,
            updatedAt: input.now,
        });
    }
    static rehydrate(props) {
        return new Agent({ ...props });
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
    disable(actorUserId, now) {
        if (actorUserId !== this.props.userId) {
            throw new DomainError("AGENT_OWNER_INVALID", "Only the agent owner can disable the agent.", {
                agentId: this.props.id,
                actorUserId,
            });
        }
        this.props = {
            ...this.props,
            status: "DISABLED",
            updatedAt: now,
        };
    }
}
export function validateAgentName(name) {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        throw new DomainError("AGENT_NAME_REQUIRED", "Agent name is required.");
    }
    if (trimmed.length > 120) {
        throw new DomainError("AGENT_NAME_TOO_LONG", "Agent name must be 120 characters or fewer.", {
            length: trimmed.length,
        });
    }
}
