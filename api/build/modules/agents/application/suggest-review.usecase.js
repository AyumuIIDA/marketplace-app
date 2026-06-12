export class SuggestReviewUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        return this.deps.aiAssistant.suggestReview(input);
    }
}
