import type { Message } from "./message.entity.js";
import type { MessageStatus } from "./message-status.type.js";

export type SearchMessagesInput = {
  orderId?: string;
  participantId?: string;
  senderId?: string;
  recipientId?: string;
  status?: MessageStatus;
  limit?: number;
};

export interface MessageRepository {
  save(message: Message): Promise<void>;
  findById(messageId: string): Promise<Message | undefined>;
  search(input: SearchMessagesInput): Promise<Message[]>;
}
