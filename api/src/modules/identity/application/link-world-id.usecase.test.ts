import { describe, expect, it } from "vitest";

import {
  AppError,
  AuthorizationError,
  FixedClock,
  FixedIdGenerator,
  ok,
  type Result,
} from "../../../shared/index.js";
import {
  User,
  type AuthIdentity,
  type AuthIdentityRepository,
  type AuthProvider,
  type CreateAuthIdentityInput,
  type UserRepository,
} from "../domain/index.js";
import type {
  VerifyWorldIdProofInput,
  VerifyWorldIdProofOutput,
  WorldIdVerifier,
} from "../../signatures/index.js";

import { LinkWorldIdUseCase } from "./link-world-id.usecase.js";

const fixedNow = new Date("2026-06-09T00:00:00.000Z");

describe("LinkWorldIdUseCase", () => {
  it("should link a World ID and mark the user human verified", async () => {
    const userRepository = new FakeUserRepository();
    const authIdentityRepository = new FakeAuthIdentityRepository();
    await userRepository.save(createUser("user-1"));
    const useCase = createUseCase(userRepository, authIdentityRepository);

    const output = await useCase.execute({
      userId: "user-1",
      idKitResult: {
        action: "ACCOUNT_LINK",
        environment: "production",
        responses: [{ nullifier: "nullifier-1" }],
      },
      expectedEnvironment: "production",
    });

    expect(output).toEqual({
      userId: "user-1",
      humanVerified: true,
      humanVerifiedAt: fixedNow,
    });
    expect((await userRepository.findById("user-1"))?.snapshot.humanVerifiedAt).toEqual(fixedNow);
    expect(
      await authIdentityRepository.findByProviderSubject("world_id", "nullifier-1"),
    ).toMatchObject({
      userId: "user-1",
      provider: "world_id",
      providerSubject: "nullifier-1",
    });
  });

  it("should reject linking a World ID owned by another user", async () => {
    const userRepository = new FakeUserRepository();
    const authIdentityRepository = new FakeAuthIdentityRepository();
    await userRepository.save(createUser("user-1"));
    await authIdentityRepository.save({
      id: "auth-identity-existing",
      userId: "other-user",
      provider: "world_id",
      providerSubject: "nullifier-1",
      createdAt: fixedNow,
    });
    const useCase = createUseCase(userRepository, authIdentityRepository);

    await expect(
      useCase.execute({
        userId: "user-1",
        idKitResult: {
          action: "ACCOUNT_LINK",
          environment: "production",
          responses: [{ nullifier: "nullifier-1" }],
        },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

function createUseCase(
  userRepository: UserRepository,
  authIdentityRepository: AuthIdentityRepository,
): LinkWorldIdUseCase {
  return new LinkWorldIdUseCase({
    userRepository,
    authIdentityRepository,
    worldIdVerifier: new FakeWorldIdVerifier(),
    idGenerator: new FixedIdGenerator(["auth-identity-1"]),
    clock: new FixedClock(fixedNow),
  });
}

function createUser(userId: string): User {
  return User.create({
    id: userId,
    displayName: "Test User",
    email: "test@example.com",
    now: fixedNow,
  });
}

class FakeUserRepository implements UserRepository {
  users = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async findById(userId: string): Promise<User | undefined> {
    return this.users.get(userId);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return [...this.users.values()].find((user) => user.snapshot.email === email);
  }
}

class FakeAuthIdentityRepository implements AuthIdentityRepository {
  identities = new Map<string, AuthIdentity>();

  async save(input: CreateAuthIdentityInput): Promise<AuthIdentity> {
    const identity = {
      id: input.id,
      userId: input.userId,
      provider: input.provider,
      providerSubject: input.providerSubject,
      createdAt: input.createdAt,
    };

    this.identities.set(this.key(input.provider, input.providerSubject), identity);

    return identity;
  }

  async findByProviderSubject(
    provider: AuthProvider,
    providerSubject: string,
  ): Promise<AuthIdentity | undefined> {
    return this.identities.get(this.key(provider, providerSubject));
  }

  private key(provider: AuthProvider, providerSubject: string): string {
    return `${provider}:${providerSubject}`;
  }
}

class FakeWorldIdVerifier implements WorldIdVerifier {
  async verify(input: VerifyWorldIdProofInput): Promise<Result<VerifyWorldIdProofOutput, AppError>> {
    const proof = input.idKitResult.responses?.[0];

    return ok({
      action: typeof input.idKitResult.action === "string" ? input.idKitResult.action : "",
      nullifierHash: proof?.nullifier ?? "nullifier-1",
      verificationLevel: proof?.identifier ?? "orb",
      signalHash: proof?.signal_hash,
      environment:
        typeof input.idKitResult.environment === "string"
          ? input.idKitResult.environment
          : "production",
      verifiedAt: fixedNow,
    });
  }
}
