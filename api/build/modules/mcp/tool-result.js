import { AppError } from "../../shared/index.js";
export function toolSucceeded(data) {
    return {
        status: "SUCCEEDED",
        data,
    };
}
export function toolRequiresHumanSignature(data) {
    return {
        status: "REQUIRES_HUMAN_SIGNATURE",
        data,
    };
}
export function toolRequiresConfirmation(data) {
    return {
        status: "REQUIRES_CONFIRMATION",
        data,
    };
}
export function toolFailed(error) {
    if (error instanceof AppError) {
        return {
            status: "FAILED",
            error: {
                code: error.code,
                message: error.message,
                details: error.details,
            },
        };
    }
    return {
        status: "FAILED",
        error: {
            code: "UNKNOWN_ERROR",
            message: "Unknown MCP tool error.",
        },
    };
}
