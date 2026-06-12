import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

import { AppError, ValidationAppError } from "../../shared/index.js";

type HttpErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function handleHttpError(error: Error, c: Context): Response {
  if (error instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: "HTTP_ERROR",
          message: error.message,
        },
      } satisfies HttpErrorResponse,
      toContentfulStatusCode(error.status),
    );
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

  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error.",
      },
    } satisfies HttpErrorResponse,
    500,
  );
}

function toContentfulStatusCode(statusCode: number): ContentfulStatusCode {
  return statusCode as ContentfulStatusCode;
}

function toHttpErrorResponse(error: AppError): HttpErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}
