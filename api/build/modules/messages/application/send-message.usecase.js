import { Message } from "../domain/index.js";
import { toMessageOutput } from "./message.presenter.js";
export class SendMessageUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        return this.executeWithContext(input, {
            messageRepository: this.deps.messageRepository,
        });
    }
    async executeWithContext(input, context) {
        const message = Message.create({
            id: this.deps.idGenerator.newId(),
            orderId: input.orderId,
            senderId: input.senderId,
            recipientId: input.recipientId,
            agentId: input.agentId,
            body: input.body,
            now: this.deps.clock.now(),
        });
        await context.messageRepository.save(message);
        return toMessageOutput(message);
    }
}
