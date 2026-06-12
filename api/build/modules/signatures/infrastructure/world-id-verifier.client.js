import { AppError, InfrastructureError, err, ok } from "../../../shared/index.js";
export class WorldIdVerifierClient {
    config;
    endpointBaseUrl;
    fetchFn;
    constructor(config) {
        this.config = config;
        if (config.rpId.trim().length === 0) {
            throw new InfrastructureError("World ID rpId is required.");
        }
        this.endpointBaseUrl = config.endpointBaseUrl ?? "https://developer.world.org";
        this.fetchFn = config.fetchFn ?? fetch;
    }
    async verify(input) {
        try {
            const response = await this.fetchFn(this.verifyUrl(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(input.idKitResult),
            });
            const body = (await response.json());
            if (!isWorldIdVerifyResponse(body)) {
                return err(new InfrastructureError("World ID verify response shape is invalid."));
            }
            if (!response.ok) {
                return err(new InfrastructureError("World ID verify request failed.", {
                    status: response.status,
                    message: body.message,
                }));
            }
            if (body.success !== true) {
                return err(new AppError("WORLD_ID_VERIFICATION_FAILED", body.message ?? "World ID verification failed.", 400, {
                    resultCode: body.results?.find((result) => result.success === false)?.code,
                }));
            }
            return ok({
                action: body.action ?? readIdKitAction(input),
                nullifierHash: body.nullifier ?? firstResultNullifier(body) ?? readIdKitNullifier(input),
                verificationLevel: firstResultIdentifier(body) ?? readIdKitIdentifier(input),
                signalHash: readIdKitSignalHash(input),
                environment: body.environment ?? readIdKitEnvironment(input),
                verifiedAt: parseCreatedAt(body.created_at),
            });
        }
        catch (error) {
            return err(toInfrastructureError(error, "World ID verify request failed."));
        }
    }
    verifyUrl() {
        return `${this.endpointBaseUrl.replace(/\/$/, "")}/api/v4/verify/${this.config.rpId}`;
    }
}
function isWorldIdVerifyResponse(value) {
    return typeof value === "object" && value !== null;
}
function firstResultNullifier(response) {
    return response.results?.find((result) => result.nullifier !== undefined)?.nullifier;
}
function firstResultIdentifier(response) {
    return response.results?.find((result) => result.identifier !== undefined)?.identifier;
}
function readIdKitAction(input) {
    return requiredString(input.idKitResult.action, "World ID action is missing.");
}
function readIdKitEnvironment(input) {
    return requiredString(input.idKitResult.environment, "World ID environment is missing.");
}
function readIdKitIdentifier(input) {
    return requiredString(firstIdKitResponse(input)?.identifier, "World ID verification identifier is missing.");
}
function readIdKitSignalHash(input) {
    return firstIdKitResponse(input)?.signal_hash;
}
function readIdKitNullifier(input) {
    return requiredString(firstIdKitResponse(input)?.nullifier, "World ID nullifier is missing.");
}
function firstIdKitResponse(input) {
    return input.idKitResult.responses?.[0];
}
function requiredString(value, message) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new InfrastructureError(message);
    }
    return value;
}
function parseCreatedAt(createdAt) {
    if (createdAt === undefined) {
        return new Date();
    }
    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) {
        return new Date();
    }
    return parsed;
}
function toInfrastructureError(error, fallbackMessage) {
    if (error instanceof InfrastructureError) {
        return error;
    }
    if (error instanceof Error) {
        return new InfrastructureError(fallbackMessage, { cause: error.message });
    }
    return new InfrastructureError(fallbackMessage);
}
