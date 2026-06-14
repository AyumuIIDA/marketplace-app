import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import type { Clock, IdGenerator } from "../../../shared/index.js";
import {
  assertWorldIdMatchesAction,
  type IdKitResult,
  type WorldIdVerifier,
} from "../../signatures/index.js";
import type { AuthIdentityRepository, UserRepository } from "../domain/index.js";

export type LinkWorldIdInput = {
  userId: string;
  idKitResult: IdKitResult;
  expectedEnvironment?: string;
};

export type LinkWorldIdOutput = {
  userId: string;
  humanVerified: true;
  humanVerifiedAt: Date;
};

export type LinkWorldIdDeps = {
  userRepository: UserRepository;
  authIdentityRepository: AuthIdentityRepository;
  worldIdVerifier: WorldIdVerifier;
  idGenerator: IdGenerator;
  clock: Clock;
};

export class LinkWorldIdUseCase {
  constructor(private readonly deps: LinkWorldIdDeps) {}

  async execute(input: LinkWorldIdInput): Promise<LinkWorldIdOutput> {
    const user = await this.deps.userRepository.findById(input.userId);

    if (user === undefined) {
      throw new NotFoundError("User", input.userId);
    }

    if (user.status !== "ACTIVE") {
      throw new AuthorizationError("Only active users can link World ID.", {
        userId: input.userId,
      });
    }

    const verification = await this.deps.worldIdVerifier.verify({
      idKitResult: input.idKitResult,
    });

    if (!verification.ok) {
      throw verification.error;
    }

    assertWorldIdMatchesAction({
      verifiedWorldId: verification.value,
      expectedAction: "ACCOUNT_LINK",
      expectedEnvironment: input.expectedEnvironment,
    });

    const existingIdentity = await this.deps.authIdentityRepository.findByProviderSubject(
      "world_id",
      verification.value.nullifierHash,
    );

    if (existingIdentity !== undefined && existingIdentity.userId !== input.userId) {
      throw new AuthorizationError("This World ID is already linked to another user.", {
        userId: input.userId,
      });
    }

    const now = this.deps.clock.now();

    await this.deps.authIdentityRepository.save({
      id: this.deps.idGenerator.newId(),
      userId: input.userId,
      provider: "world_id",
      providerSubject: verification.value.nullifierHash,
      createdAt: now,
    });

    user.markHumanVerified(now);
    await this.deps.userRepository.save(user);

    return {
      userId: user.id,
      humanVerified: true,
      humanVerifiedAt: now,
    };
  }
}
