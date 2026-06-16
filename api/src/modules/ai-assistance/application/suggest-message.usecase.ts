import type { AiAssistant, SuggestMessageInput, SuggestMessageResult } from "./ai-assistant.port.js";

export type SuggestMessageUseCaseDeps = {
  aiAssistant: AiAssistant;
};

export class SuggestMessageUseCase {
  constructor(private readonly deps: SuggestMessageUseCaseDeps) {}

  async execute(input: SuggestMessageInput): Promise<SuggestMessageResult> {
    return this.deps.aiAssistant.suggestMessage(input);
  }
}
