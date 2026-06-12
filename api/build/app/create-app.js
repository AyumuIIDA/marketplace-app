import { Hono } from "hono";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getCurrentUser, handleHttpError } from "../interface/http/index.js";
import { createMcpServer } from "../modules/mcp/index.js";
import { createAgentController } from "../modules/agents/interface/index.js";
import { createIdentityController } from "../modules/identity/interface/index.js";
import { createListingController } from "../modules/listings/interface/index.js";
import { createMessageController, createOrderMessageController, } from "../modules/messages/interface/index.js";
import { createOrderController } from "../modules/orders/interface/index.js";
import { createReviewController } from "../modules/reviews/interface/index.js";
export function createApiApp(deps) {
    const app = new Hono();
    app.onError(handleHttpError);
    app.get("/health", (c) => c.json({
        status: "ok",
    }));
    app.route("/agents", createAgentController(deps.agentControllerDeps));
    app.route("/", createIdentityController(deps.identityControllerDeps));
    app.route("/listings", createListingController(deps.listingControllerDeps));
    app.route("/orders", createOrderController(deps.orderControllerDeps));
    app.route("/orders", createOrderMessageController(deps.messageControllerDeps));
    app.route("/messages", createMessageController(deps.messageControllerDeps));
    app.route("/reviews", createReviewController(deps.reviewControllerDeps));
    // MCP transport（stateless）。同一Hono appの1 pathとして公開し、リクエストごとに構築する。
    app.all("/mcp", async (c) => {
        const { userId } = getCurrentUser(c);
        const server = createMcpServer(deps.mcpTools, {
            userId,
            agentId: c.req.header("x-agent-id"),
        });
        const transport = new WebStandardStreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
        });
        await server.connect(transport);
        return transport.handleRequest(c.req.raw);
    });
    return app;
}
