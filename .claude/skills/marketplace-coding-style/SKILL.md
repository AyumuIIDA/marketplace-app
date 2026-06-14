---
name: marketplace-coding-style
description: Apply this repository's TypeScript implementation rules for the Human-backed Marketplace app. Use when Claude Code implements, edits, reviews, or refactors TypeScript code in this repo, especially backend modules, DDD/onion architecture layers, Hono handlers, MCP tools, Drizzle repositories, error handling, logging, Result usage, validation, transactions, or shared types.
---

# Marketplace Coding Style

## Core Rule

Follow the project TypeScript rules in `docs/typescript-style-chatgpt.md` whenever implementing or reviewing code in this repository. Follow `docs/test-strategy-chatgpt.md` when adding or changing behavior that should be covered by tests. Read these documents before substantial TypeScript work or when unsure about style or test expectations.

## Required Coding Style

- Use DDD/onion layering: `domain`, `application`, `infrastructure`, `interface`, `modules/mcp`, `db`, and `shared`.
- Keep dependencies inward: REST/MCP adapters call Application UseCases; Application calls Domain; Infrastructure implements ports.
- Keep module boundaries explicit: single-module operations live in that module's `application/`; operations that change multiple modules are promoted to `api/src/app/workflows/`.
- Cross-module workflows may use a single DB transaction in the modular monolith, but should be designed so they can become Saga/Process Manager flows if modules later split into services.
- Modules must not import another module's repositories, schemas, or infrastructure; use the other module's public application service/port only.
- Implement UseCases as classes with `execute()`.
- Use named functions for pure helpers such as payload hashing, status checks, and formatting.
- Avoid over-curried functions and heavy functional abstractions.
- Prefer named exports. Use default exports only when framework conventions require them.
- Name files with kebab-case and role suffixes such as `listing.entity.ts`, `create-listing.usecase.ts`, `drizzle-listing.repository.ts`, `listing.controller.ts`, and `publish-listing.tool.ts`.
- Define Domain Entities as classes. Define Domain Policies as named functions.

## Error Handling

- Throw `AppError`/`DomainError` style errors in Domain and Application code.
- Use `Result<T, E>` only at external boundaries such as World ID, OpenAI, Cloud Storage, or remote MCP clients.
- Convert external `Result` failures to thrown errors inside UseCases.
- Catch errors only at REST/MCP boundaries and convert them to HTTP responses or ToolResult failures.
- Treat caught values as `unknown`; do not use `catch (error: any)`.

## Generics

- Allow only low-friction generics such as `Result<T, E>`, `Paginated<T>`, `ToolResult<TData>`, and limited repository helper types.
- Do not introduce generic UseCase abstractions such as `UseCase<TInput, TOutput, TError, TContext, TDeps>`.

## Validation, Logging, and Transactions

- Use Zod for input validation and infer DTO types from schemas.
- Do not let Domain entities depend on Zod, Drizzle, HTTP, MCP, OpenAI, World ID, or Cloud Storage.
- Use structured logs with context such as `requestId`, `userId`, `agentId`, `toolCallId`, `resourceType`, and `resourceId`.
- Never log raw prompts, World ID proofs, payment data, addresses, secrets, or access tokens.
- Define transaction boundaries in module Application UseCases for single-module changes, or in `app/workflows/` for cross-module changes. Repositories must not start transactions on their own.
- Keep Drizzle inside Infrastructure/Repository implementations.
- Discuss before adding new cross-cutting utilities to `shared`; do not add shared helpers opportunistically.
- Keep ID generation in `shared/ids` via `IdGenerator`; Domain receives IDs, and repositories do not generate IDs.

## Testing

- Add or update tests according to `docs/test-strategy-chatgpt.md`.
- Prioritize Domain/Application unit tests and MCP Tool tests before broad E2E tests.
- Use fake repositories and fake external clients for Application tests.
- Cover Human Signature requirements, confirmation requirements, and state transition errors for affected UseCases.

## Quick Check Before Coding

Before adding or editing TypeScript code, verify:

1. The file is in the correct layer.
2. The dependency direction is valid.
3. Errors are thrown internally and converted only at boundaries.
4. External API clients use `Result<T, E>` only where useful.
5. Any generic type is simple and justified.
6. Drizzle is not imported outside DB/Infrastructure.
7. MCP tools and REST controllers do not contain business rules.
8. Required tests are added or updated for changed behavior.
9. File names follow `feature.role.ts` with kebab-case.
10. New shared utilities have been explicitly justified and discussed.