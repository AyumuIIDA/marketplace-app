import type { AiAssistant, SuggestReviewInput, SuggestReviewResult } from "./ai-assistant.port.js";

export type SuggestReviewUseCaseDeps = {
  aiAssistant: AiAssistant;
};

export class SuggestReviewUseCase {
  constructor(private readonly deps: SuggestReviewUseCaseDeps) {}

  async execute(input: SuggestReviewInput): Promise<SuggestReviewResult> {
    return this.deps.aiAssistant.suggestReview(input);
  }
}
