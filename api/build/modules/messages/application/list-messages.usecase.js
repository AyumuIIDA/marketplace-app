import { toMessageOutput } from "./message.presenter.js";
export class ListMessagesUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const messages = await this.deps.messageRepository.search(input);
        return {
            items: messages.map(toMessageOutput),
        };
    }
}
