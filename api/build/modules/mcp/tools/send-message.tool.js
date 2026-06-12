import { z } from "zod";
import { toolSucceeded } from "../tool-result.js";
const sendMessageToolInputSchema = z.object({
    orderId: z.string().min(1),
    body: z.string().min(1).max(5000),
});
export class SendMessageTool {
    deps;
    name = "send_message";
    inputSchema = sendMessageToolInputSchema.shape;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input, context) {
        const parsed = sendMessageToolInputSchema.parse(input);
        const output = await this.deps.sendOrderMessageWorkflow.execute({
            orderId: parsed.orderId,
            senderId: context.userId,
            body: parsed.body,
            agentId: context.agentId,
        });
        return toolSucceeded(output);
    }
}
