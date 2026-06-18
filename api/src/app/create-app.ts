import { Hono, type Context } from "hono";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import {
  createBffAuthMiddleware,
  getCurrentUser,
  handleHttpError,
  type BffAuthConfig,
} from "../interface/http/index.js";
import { createMcpServer, type McpTool, type McpToolRunner } from "../modules/mcp/index.js";
import { createAgentController, type AgentControllerDeps } from "../modules/agents/interface/index.js";
import {
  createAiAssistanceController,
  type AiAssistanceControllerDeps,
} from "../modules/ai-assistance/interface/index.js";
import { createIdentityController, type IdentityControllerDeps } from "../modules/identity/interface/index.js";
import { createListingController, type ListingControllerDeps } from "../modules/listings/interface/index.js";
import {
  createMessageController,
  createOrderMessageController,
  type MessageControllerDeps,
} from "../modules/messages/interface/index.js";
import { createOrderController, type OrderControllerDeps } from "../modules/orders/interface/index.js";
import { createReviewController, type ReviewControllerDeps } from "../modules/reviews/interface/index.js";

export type ApiAppDeps = {
  agentControllerDeps: AgentControllerDeps;
  aiAssistanceControllerDeps: AiAssistanceControllerDeps;
  identityControllerDeps: IdentityControllerDeps;
  listingControllerDeps: ListingControllerDeps;
  messageControllerDeps: MessageControllerDeps;
  orderControllerDeps: OrderControllerDeps;
  reviewControllerDeps: ReviewControllerDeps;
  mcpTools: McpTool[];
  // 全MCP tool呼び出しを監査記録するrunner。createMcpServerへ渡す。
  mcpToolRunner: McpToolRunner;
};

export function createApiApp(deps: ApiAppDeps, authConfig: BffAuthConfig): Hono {
  const app = new Hono();

  app.onError(handleHttpError);

  // /health は認証不要。以降の route はBFF認証ミドルウェアを通す。
  app.get("/health", (c) =>
    c.json({
      status: "ok",
    }),
  );

  // 未ログインでも閲覧できる公開GET（商品一覧・商品詳細のみ）。
  // 一覧 GET /listings と 詳細 GET /listings/:id（1セグメント）に限定する。
  const isPublicRequest = (c: Context): boolean => {
    if (c.req.method !== "GET") {
      return false;
    }

    const path = c.req.path;

    return path === "/listings" || /^\/listings\/[^/]+$/.test(path);
  };

  app.use("*", createBffAuthMiddleware({ ...authConfig, isPublicRequest }));

  app.route("/agents", createAgentController(deps.agentControllerDeps));
  app.route("/ai-assistance", createAiAssistanceController(deps.aiAssistanceControllerDeps));
  app.route("/", createIdentityController(deps.identityControllerDeps));
  app.route("/listings", createListingController(deps.listingControllerDeps));
  app.route("/orders", createOrderController(deps.orderControllerDeps));
  app.route("/orders", createOrderMessageController(deps.messageControllerDeps));
  app.route("/messages", createMessageController(deps.messageControllerDeps));
  app.route("/reviews", createReviewController(deps.reviewControllerDeps));

  // MCP transport（stateless）。同一Hono appの1 pathとして公開し、リクエストごとに構築する。
  app.all("/mcp", async (c) => {
    const { userId } = getCurrentUser(c);
    const server = createMcpServer(
      deps.mcpTools,
      {
        userId,
        agentId: c.req.header("x-agent-id"),
      },
      deps.mcpToolRunner,
    );
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);

    return transport.handleRequest(c.req.raw);
  });

  return app;
}
