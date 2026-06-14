import type {
  AiAssistant,
  CompareListingsInput,
  CompareListingsResult,
} from "./ai-assistant.port.js";

export type CompareListingsUseCaseDeps = {
  aiAssistant: AiAssistant;
};

// listing取得はworkflow側の責務。本usecaseは取得済みデータのAI比較に専念する。
export class CompareListingsUseCase {
  constructor(private readonly deps: CompareListingsUseCaseDeps) {}

  async execute(input: CompareListingsInput): Promise<CompareListingsResult> {
    return this.deps.aiAssistant.compareListings(input);
  }
}
