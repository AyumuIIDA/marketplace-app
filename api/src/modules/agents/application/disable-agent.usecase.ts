import { NotFoundError } from "../../../shared/index.js";
import type { Clock } from "../../../shared/index.js";
import type { AgentRepository } from "../domain/index.js";

import { toAgentOutput, type AgentOutput } from "./agent.presenter.js";

export type DisableAgentInput = {
  agentId: string;
  userId: string;
};

export type DisableAgentDeps = {
  agentRepository: AgentRepository;
  clock: Clock;
};

export class DisableAgentUseCase {
  constructor(private readonly deps: DisableAgentDeps) {}

  async execute(input: DisableAgentInput): Promise<AgentOutput> {
    const agent = await this.deps.agentRepository.findById(input.agentId);

    if (agent === undefined) {
      throw new NotFoundError("Agent", input.agentId);
    }

    agent.disable(input.userId, this.deps.clock.now());
    await this.deps.agentRepository.save(agent);

    return toAgentOutput(agent);
  }
}
