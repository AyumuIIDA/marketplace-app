import type {
  AiAssistant,
  SuggestListingFieldsInput,
  SuggestListingFieldsResult,
} from "./ai-assistant.port.js";
import { ValidationAppError } from "../../../shared/index.js";

export type SuggestListingFieldsUseCaseDeps = {
  aiAssistant: AiAssistant;
};

export class SuggestListingFieldsUseCase {
  constructor(private readonly deps: SuggestListingFieldsUseCaseDeps) {}

  async execute(input: SuggestListingFieldsInput): Promise<SuggestListingFieldsResult> {
    if (input.imageUrls.length === 0) {
      throw new ValidationAppError("At least one product image is required.", {
        field: "imageUrls",
      });
    }

    return this.deps.aiAssistant.suggestListingFields(input);
  }
}
