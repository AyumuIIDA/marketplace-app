import type { MessageRepository, MessageStatus } from "../domain/index.js";

import { toMessageOutput, type MessageOutput } from "./message.presenter.js";

export type ListMessagesInput = {
  orderId?: string;
  participantId?: string;
  status?: MessageStatus;
  limit?: number;
};

export type ListMessagesDeps = {
  messageRepository: MessageRepository;
};

export class ListMessagesUseCase {
  constructor(private readonly deps: ListMessagesDeps) {}

  async execute(input: ListMessagesInput): Promise<{ items: MessageOutput[] }> {
    const messages = await this.deps.messageRepository.search(input);

    return {
      items: messages.map(toMessageOutput),
    };
  }
}
