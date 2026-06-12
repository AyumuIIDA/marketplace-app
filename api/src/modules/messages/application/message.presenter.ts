import type { Message, MessageStatus } from "../domain/index.js";

export type MessageOutput = {
  messageId: string;
  orderId: string;
  senderId: string;
  recipientId: string;
  agentId?: string;
  body: string;
  status: MessageStatus;
  createdAt: string;
  hiddenAt?: string;
};

export function toMessageOutput(message: Message): MessageOutput {
  const snapshot = message.snapshot;

  return {
    messageId: snapshot.id,
    orderId: snapshot.orderId,
    senderId: snapshot.senderId,
    recipientId: snapshot.recipientId,
    agentId: snapshot.agentId,
    body: snapshot.body,
    status: snapshot.status,
    createdAt: snapshot.createdAt.toISOString(),
    hiddenAt: snapshot.hiddenAt?.toISOString(),
  };
}
