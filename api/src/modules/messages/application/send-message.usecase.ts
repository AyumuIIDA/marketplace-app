import type { Clock, IdGenerator } from "../../../shared/index.js";
import { Message, type MessageRepository } from "../domain/index.js";

import { toMessageOutput, type MessageOutput } from "./message.presenter.js";

export type MessageContext = {
  messageRepository: MessageRepository;
};

export type SendMessageInput = {
  orderId: string;
  senderId: string;
  recipientId: string;
  agentId?: string;
  body: string;
};

export type SendMessageDeps = {
  messageRepository: MessageRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class SendMessageUseCase {
  constructor(private readonly deps: SendMessageDeps) {}

  async execute(input: SendMessageInput): Promise<MessageOutput> {
    return this.executeWithContext(input, {
      messageRepository: this.deps.messageRepository,
    });
  }

  async executeWithContext(input: SendMessageInput, context: MessageContext): Promise<MessageOutput> {
    const message = Message.create({
      id: this.deps.idGenerator.newId(),
      orderId: input.orderId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      agentId: input.agentId,
      body: input.body,
      now: this.deps.clock.now(),
    });

    await context.messageRepository.save(message);

    return toMessageOutput(message);
  }
}
