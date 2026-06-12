import { NotFoundError } from "../../../shared/index.js";
import { toAgentOutput } from "./agent.presenter.js";
export class DisableAgentUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const agent = await this.deps.agentRepository.findById(input.agentId);
        if (agent === undefined) {
            throw new NotFoundError("Agent", input.agentId);
        }
        agent.disable(input.userId, this.deps.clock.now());
        await this.deps.agentRepository.save(agent);
        return toAgentOutput(agent);
    }
}
