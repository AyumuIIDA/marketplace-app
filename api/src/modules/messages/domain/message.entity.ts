import { DomainError } from "../../../shared/index.js";

import type { MessageStatus } from "./message-status.type.js";

export type MessageProps = {
  id: string;
  orderId: string;
  senderId: string;
  recipientId: string;
  agentId?: string;
  body: string;
  status: MessageStatus;
  createdAt: Date;
  hiddenAt?: Date;
};

export type CreateMessageProps = {
  id: string;
  orderId: string;
  senderId: string;
  recipientId: string;
  agentId?: string;
  body: string;
  now: Date;
};

export class Message {
  private constructor(private props: MessageProps) {}

  static create(input: CreateMessageProps): Message {
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

  static rehydrate(props: MessageProps): Message {
    return new Message({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get senderId(): string {
    return this.props.senderId;
  }

  get recipientId(): string {
    return this.props.recipientId;
  }

  get status(): MessageStatus {
    return this.props.status;
  }

  get snapshot(): MessageProps {
    return { ...this.props };
  }

  hide(actorId: string, now: Date): void {
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

export function validateMessageBody(body: string): void {
  if (body.trim().length === 0) {
    throw new DomainError("MESSAGE_BODY_REQUIRED", "Message body is required.");
  }
  if (body.length > 5000) {
    throw new DomainError("MESSAGE_BODY_TOO_LONG", "Message body must be 5000 characters or fewer.", {
      length: body.length,
    });
  }
}
