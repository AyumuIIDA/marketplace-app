import { Agent } from "../domain/index.js";
import { toAgentOutput } from "./agent.presenter.js";
export class CreateAgentUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
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
