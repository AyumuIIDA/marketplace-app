import { NotFoundError } from "../../../shared/index.js";
import { toMessageOutput } from "./message.presenter.js";
export class HideMessageUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const message = await this.deps.messageRepository.findById(input.messageId);
        if (message === undefined) {
            throw new NotFoundError("Message", input.messageId);
        }
        message.hide(input.actorId, this.deps.clock.now());
        await this.deps.messageRepository.save(message);
        return toMessageOutput(message);
    }
}
