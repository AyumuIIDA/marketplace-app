import { describe, expect, it } from "vitest";
import { FixedClock, FixedIdGenerator } from "../../../shared/index.js";
import { Message } from "../domain/index.js";
import { HideMessageUseCase } from "./hide-message.usecase.js";
import { ListMessagesUseCase } from "./list-messages.usecase.js";
import { SendMessageUseCase } from "./send-message.usecase.js";
const fixedNow = new Date("2026-06-09T00:00:00.000Z");
describe("Message use cases", () => {
    it("should send and list messages", async () => {
        const messageRepository = new FakeMessageRepository();
        const sendMessageUseCase = new SendMessageUseCase({
            messageRepository,
            idGenerator: new FixedIdGenerator(["message-1"]),
            clock: new FixedClock(fixedNow),
        });
        const listMessagesUseCase = new ListMessagesUseCase({
            messageRepository,
        });
        const sent = await sendMessageUseCase.execute({
            orderId: "order-1",
            senderId: "buyer-1",
            recipientId: "seller-1",
            body: "Hello.",
        });
        const listed = await listMessagesUseCase.execute({
            orderId: "order-1",
            participantId: "buyer-1",
        });
        expect(sent).toMatchObject({
            messageId: "message-1",
            status: "SENT",
        });
        expect(listed.items).toHaveLength(1);
        expect(listed.items[0]).toMatchObject({
            messageId: "message-1",
            body: "Hello.",
        });
    });
    it("should hide a message", async () => {
        const messageRepository = new FakeMessageRepository();
        const message = Message.create({
            id: "message-1",
            orderId: "order-1",
            senderId: "buyer-1",
            recipientId: "seller-1",
            body: "Hello.",
            now: fixedNow,
        });
        await messageRepository.save(message);
        const hideMessageUseCase = new HideMessageUseCase({
            messageRepository,
            clock: new FixedClock(fixedNow),
        });
        const output = await hideMessageUseCase.execute({
            messageId: "message-1",
            actorId: "seller-1",
        });
        expect(output).toMatchObject({
            messageId: "message-1",
            status: "HIDDEN",
            hiddenAt: fixedNow.toISOString(),
        });
    });
});
class FakeMessageRepository {
    messages = new Map();
    async save(message) {
        this.messages.set(message.id, message);
    }
    async findById(messageId) {
        return this.messages.get(messageId);
    }
    async search(input) {
        return [...this.messages.values()]
            .filter((message) => {
            const snapshot = message.snapshot;
            return ((input.orderId === undefined || snapshot.orderId === input.orderId) &&
                (input.participantId === undefined ||
                    snapshot.senderId === input.participantId ||
                    snapshot.recipientId === input.participantId) &&
                (input.status === undefined || snapshot.status === input.status));
        })
            .slice(0, input.limit ?? 50);
    }
}
