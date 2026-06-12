import type { AgentRepository, AgentStatus } from "../domain/index.js";

import { toAgentOutput, type AgentOutput } from "./agent.presenter.js";

export type ListAgentsInput = {
  userId: string;
  status?: AgentStatus;
  limit?: number;
};

export type ListAgentsDeps = {
  agentRepository: AgentRepository;
};

export class ListAgentsUseCase {
  constructor(private readonly deps: ListAgentsDeps) {}

  async execute(input: ListAgentsInput): Promise<{ items: AgentOutput[] }> {
    const agents = await this.deps.agentRepository.search(input);

    return {
      items: agents.map(toAgentOutput),
    };
  }
}
