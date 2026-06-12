export class SuggestPriceUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        return this.deps.aiAssistant.suggestPrice(input);
    }
}
