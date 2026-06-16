import { describe, expect, it } from "vitest";

import { FixedClock, FixedIdGenerator } from "../../../shared/index.js";
import { Agent, type AgentRepository, type SearchAgentsInput } from "../domain/index.js";

import { CreateAgentUseCase } from "./create-agent.usecase.js";
import { DisableAgentUseCase } from "./disable-agent.usecase.js";
import { ListAgentsUseCase } from "./list-agents.usecase.js";

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
});

class FakeAgentRepository implements AgentRepository {
  agents = new Map<string, Agent>();

  async save(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);
  }

  async findById(agentId: string): Promise<Agent | undefined> {
    return this.agents.get(agentId);
  }

  async search(input: SearchAgentsInput): Promise<Agent[]> {
    return [...this.agents.values()].filter((agent) => {
      const snapshot = agent.snapshot;
      return (
        (input.userId === undefined || snapshot.userId === input.userId) &&
        (input.status === undefined || snapshot.status === input.status)
      );
    });
  }
}
