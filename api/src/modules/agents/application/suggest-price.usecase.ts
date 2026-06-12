import type { AiAssistant, SuggestPriceInput, SuggestPriceResult } from "./ai-assistant.port.js";

export type SuggestPriceUseCaseDeps = {
  aiAssistant: AiAssistant;
};

export class SuggestPriceUseCase {
  constructor(private readonly deps: SuggestPriceUseCaseDeps) {}

  async execute(input: SuggestPriceInput): Promise<SuggestPriceResult> {
    return this.deps.aiAssistant.suggestPrice(input);
  }
}
