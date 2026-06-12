import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { AppError, ValidationAppError } from "../../shared/index.js";
export function handleHttpError(error, c) {
    if (error instanceof HTTPException) {
        return c.json({
            error: {
                code: "HTTP_ERROR",
                message: error.message,
            },
        }, toContentfulStatusCode(error.status));
    }
    if (error instanceof ZodError) {
        const validationError = new ValidationAppError("Request validation failed.", {
            issues: error.issues,
        });
        return c.json(toHttpErrorResponse(validationError), toContentfulStatusCode(validationError.statusCode));
    }
    if (error instanceof AppError) {
        return c.json(toHttpErrorResponse(error), toContentfulStatusCode(error.statusCode));
    }
    return c.json({
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error.",
        },
    }, 500);
}
function toContentfulStatusCode(statusCode) {
    return statusCode;
}
function toHttpErrorResponse(error) {
    return {
        error: {
            code: error.code,
            message: error.message,
            details: error.details,
        },
    };
}
