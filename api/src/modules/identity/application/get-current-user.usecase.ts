import { AuthorizationError, NotFoundError } from "../../../shared/index.js";

import type { UserRepository } from "../domain/index.js";

export type GetCurrentUserInput = {
  userId: string;
};

export type GetCurrentUserOutput = {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  status: "ACTIVE" | "SUSPENDED";
};

export type GetCurrentUserDeps = {
  userRepository: UserRepository;
};

export class GetCurrentUserUseCase {
  constructor(private readonly deps: GetCurrentUserDeps) {}

  async execute(input: GetCurrentUserInput): Promise<GetCurrentUserOutput> {
    const user = await this.deps.userRepository.findById(input.userId);

    if (user === undefined) {
      throw new NotFoundError("User", input.userId);
    }

    if (user.status !== "ACTIVE") {
      throw new AuthorizationError("Current user is not active.", { userId: input.userId });
    }

    const snapshot = user.snapshot;

    return {
      userId: snapshot.id,
      displayName: snapshot.displayName,
      email: snapshot.email,
      avatarUrl: snapshot.avatarUrl,
      status: snapshot.status,
    };
  }
}
