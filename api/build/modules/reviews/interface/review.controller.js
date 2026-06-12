import { Hono } from "hono";
import { getCurrentUser } from "../../../interface/http/index.js";
import { createReviewRequestSchema, listReviewsQuerySchema, submitReviewRequestSchema, } from "./review.dto.js";
export function createReviewController(deps) {
    const app = new Hono();
    app.get("/", async (c) => {
        const query = listReviewsQuerySchema.parse({
            orderId: c.req.query("orderId"),
            revieweeId: c.req.query("revieweeId"),
            reviewerId: c.req.query("reviewerId"),
            status: c.req.query("status"),
            limit: c.req.query("limit"),
        });
        const output = await deps.listReviewsUseCase.execute(query);
        return c.json(output, 200);
    });
    app.post("/", async (c) => {
        const currentUser = getCurrentUser(c);
        const body = createReviewRequestSchema.parse(await c.req.json());
        const output = await deps.createReviewWorkflow.execute({
            orderId: body.orderId,
            reviewerId: currentUser.userId,
            rating: body.rating,
            comment: body.comment,
            agentId: body.agentId,
        });
        return c.json(output, 201);
    });
    app.post("/:reviewId/submit", async (c) => {
        const currentUser = getCurrentUser(c);
        const body = submitReviewRequestSchema.parse(await c.req.json());
        const output = await deps.submitReviewWithHumanSignatureWorkflow.execute({
            reviewId: c.req.param("reviewId"),
            reviewerId: currentUser.userId,
            idKitResult: body.idKitResult,
            expectedEnvironment: body.expectedEnvironment,
        });
        return c.json(output, 200);
    });
    return app;
}
