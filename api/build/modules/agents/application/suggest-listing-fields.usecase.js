export class SuggestListingFieldsUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        return this.deps.aiAssistant.suggestListingFields(input);
    }
}
