import { describe, expect, it } from "vitest";
import { FixedClock, FixedIdGenerator } from "../../../shared/index.js";
import { CreateAgentUseCase } from "./create-agent.usecase.js";
import { DisableAgentUseCase } from "./disable-agent.usecase.js";
import { ListAgentsUseCase } from "./list-agents.usecase.js";
import { RecordMcpToolCallUseCase } from "./record-mcp-tool-call.usecase.js";
const fixedNow = new Date("2026-06-09T00:00:00.000Z");
describe("Agent use cases", () => {
    it("should create, list, and disable agents", async () => {
        const agentRepository = new FakeAgentRepository();
        const createAgentUseCase = new CreateAgentUseCase({
            agentRepository,
            idGenerator: new FixedIdGenerator(["agent-1"]),
            clock: new FixedClock(fixedNow),
        });
        const listAgentsUseCase = new ListAgentsUseCase({
            agentRepository,
        });
        const disableAgentUseCase = new DisableAgentUseCase({
            agentRepository,
            clock: new FixedClock(fixedNow),
        });
        const created = await createAgentUseCase.execute({
            userId: "user-1",
            name: "Listing assistant",
        });
        const listed = await listAgentsUseCase.execute({
            userId: "user-1",
        });
        const disabled = await disableAgentUseCase.execute({
            agentId: "agent-1",
            userId: "user-1",
        });
        expect(created).toMatchObject({
            agentId: "agent-1",
            status: "ACTIVE",
        });
        expect(listed.items).toHaveLength(1);
        expect(disabled).toMatchObject({
            agentId: "agent-1",
            status: "DISABLED",
        });
    });
    it("should record MCP tool calls", async () => {
        const repository = new FakeMcpToolCallRepository();
        const useCase = new RecordMcpToolCallUseCase({
            mcpToolCallRepository: repository,
            idGenerator: new FixedIdGenerator(["tool-call-1"]),
            clock: new FixedClock(fixedNow),
        });
        const output = await useCase.execute({
            agentId: "agent-1",
            userId: "user-1",
            toolName: "purchase_item",
            inputSummary: {
                listingId: "listing-1",
            },
            outputSummary: {
                status: "REQUIRES_CONFIRMATION",
            },
            status: "REQUIRES_CONFIRMATION",
        });
        expect(output).toEqual({
            toolCallId: "tool-call-1",
        });
        expect(repository.toolCalls[0]?.snapshot).toMatchObject({
            id: "tool-call-1",
            agentId: "agent-1",
            userId: "user-1",
            toolName: "purchase_item",
            status: "REQUIRES_CONFIRMATION",
        });
    });
});
class FakeAgentRepository {
    agents = new Map();
    async save(agent) {
        this.agents.set(agent.id, agent);
    }
    async findById(agentId) {
        return this.agents.get(agentId);
    }
    async search(input) {
        return [...this.agents.values()].filter((agent) => {
            const snapshot = agent.snapshot;
            return ((input.userId === undefined || snapshot.userId === input.userId) &&
                (input.status === undefined || snapshot.status === input.status));
        });
    }
}
class FakeMcpToolCallRepository {
    toolCalls = [];
    async save(toolCall) {
        this.toolCalls.push(toolCall);
    }
}
