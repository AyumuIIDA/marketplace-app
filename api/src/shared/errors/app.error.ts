export type ErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
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
  constructor(code: string, message: string, details?: ErrorDetails) {
    super(code, message, 400, details);
    this.name = "DomainError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super("NOT_FOUND", `${resource} not found: ${id}`, 404, { resource, id });
    this.name = "NotFoundError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Not authenticated", details?: ErrorDetails) {
    super("NOT_AUTHENTICATED", message, 401, details);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Not authorized", details?: ErrorDetails) {
    super("NOT_AUTHORIZED", message, 403, details);
    this.name = "AuthorizationError";
  }
}

export class ValidationAppError extends AppError {
  constructor(message = "Validation failed", details?: ErrorDetails) {
    super("VALIDATION_FAILED", message, 400, details);
    this.name = "ValidationAppError";
  }
}

export class InfrastructureError extends AppError {
  constructor(message = "Infrastructure failure", details?: ErrorDetails) {
    super("INFRASTRUCTURE_ERROR", message, 500, details);
    this.name = "InfrastructureError";
  }
}
