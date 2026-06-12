import type { Clock, IdGenerator } from "../../../shared/index.js";
import { Agent, type AgentRepository } from "../domain/index.js";

import { toAgentOutput, type AgentOutput } from "./agent.presenter.js";

export type CreateAgentInput = {
  userId: string;
  name: string;
};

export type CreateAgentDeps = {
  agentRepository: AgentRepository;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class CreateAgentUseCase {
  constructor(private readonly deps: CreateAgentDeps) {}

  async execute(input: CreateAgentInput): Promise<AgentOutput> {
    const agent = Agent.create({
      id: this.deps.idGenerator.newId(),
      userId: input.userId,
      name: input.name,
      now: this.deps.clock.now(),
    });

    await this.deps.agentRepository.save(agent);

    return toAgentOutput(agent);
  }
}
