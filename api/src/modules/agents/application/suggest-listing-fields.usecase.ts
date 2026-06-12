import type {
  AiAssistant,
  SuggestListingFieldsInput,
  SuggestListingFieldsResult,
} from "./ai-assistant.port.js";

export type SuggestListingFieldsUseCaseDeps = {
  aiAssistant: AiAssistant;
};

export class SuggestListingFieldsUseCase {
  constructor(private readonly deps: SuggestListingFieldsUseCaseDeps) {}

  async execute(input: SuggestListingFieldsInput): Promise<SuggestListingFieldsResult> {
    return this.deps.aiAssistant.suggestListingFields(input);
  }
}
