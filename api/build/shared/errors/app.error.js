export class AppError extends Error {
    code;
    statusCode;
    details;
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = "AppError";
    }
    toResponse() {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
        };
    }
}
export class DomainError extends AppError {
    constructor(code, message, details) {
        super(code, message, 400, details);
        this.name = "DomainError";
    }
}
export class NotFoundError extends AppError {
    constructor(resource, id) {
        super("NOT_FOUND", `${resource} not found: ${id}`, 404, { resource, id });
        this.name = "NotFoundError";
    }
}
export class AuthorizationError extends AppError {
    constructor(message = "Not authorized", details) {
        super("NOT_AUTHORIZED", message, 403, details);
        this.name = "AuthorizationError";
    }
}
export class ValidationAppError extends AppError {
    constructor(message = "Validation failed", details) {
        super("VALIDATION_FAILED", message, 400, details);
        this.name = "ValidationAppError";
    }
}
export class InfrastructureError extends AppError {
    constructor(message = "Infrastructure failure", details) {
        super("INFRASTRUCTURE_ERROR", message, 500, details);
        this.name = "InfrastructureError";
    }
}
