import { DomainError } from "../../../shared/index.js";
export class Message {
    props;
    constructor(props) {
        this.props = props;
    }
    static create(input) {
        if (input.senderId === input.recipientId) {
            throw new DomainError("MESSAGE_SENDER_RECIPIENT_SAME", "Sender and recipient must be different.", {
                senderId: input.senderId,
            });
        }
        validateMessageBody(input.body);
        return new Message({
            id: input.id,
            orderId: input.orderId,
            senderId: input.senderId,
            recipientId: input.recipientId,
            agentId: input.agentId,
            body: input.body,
            status: "SENT",
            createdAt: input.now,
        });
    }
    static rehydrate(props) {
        return new Message({ ...props });
    }
    get id() {
        return this.props.id;
    }
    get orderId() {
        return this.props.orderId;
    }
    get senderId() {
        return this.props.senderId;
    }
    get recipientId() {
        return this.props.recipientId;
    }
    get status() {
        return this.props.status;
    }
    get snapshot() {
        return { ...this.props };
    }
    hide(actorId, now) {
        if (actorId !== this.props.senderId && actorId !== this.props.recipientId) {
            throw new DomainError("MESSAGE_HIDE_ACTOR_INVALID", "Only message participants can hide a message.", {
                messageId: this.props.id,
                actorId,
            });
        }
        this.props = {
            ...this.props,
            status: "HIDDEN",
            hiddenAt: now,
        };
    }
}
export function validateMessageBody(body) {
    if (body.trim().length === 0) {
        throw new DomainError("MESSAGE_BODY_REQUIRED", "Message body is required.");
    }
    if (body.length > 5000) {
        throw new DomainError("MESSAGE_BODY_TOO_LONG", "Message body must be 5000 characters or fewer.", {
            length: body.length,
        });
    }
}
