import { NotFoundError } from "../../../shared/index.js";
import type { Clock } from "../../../shared/index.js";
import type { MessageRepository } from "../domain/index.js";

import { toMessageOutput, type MessageOutput } from "./message.presenter.js";

export type HideMessageInput = {
  messageId: string;
  actorId: string;
};

export type HideMessageDeps = {
  messageRepository: MessageRepository;
  clock: Clock;
};

export class HideMessageUseCase {
  constructor(private readonly deps: HideMessageDeps) {}

  async execute(input: HideMessageInput): Promise<MessageOutput> {
    const message = await this.deps.messageRepository.findById(input.messageId);

    if (message === undefined) {
      throw new NotFoundError("Message", input.messageId);
    }

    message.hide(input.actorId, this.deps.clock.now());
    await this.deps.messageRepository.save(message);

    return toMessageOutput(message);
  }
}
