import { toAgentOutput } from "./agent.presenter.js";
export class ListAgentsUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const agents = await this.deps.agentRepository.search(input);
        return {
            items: agents.map(toAgentOutput),
        };
    }
}
