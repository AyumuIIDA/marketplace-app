import type { Clock } from "../../../shared/index.js";

import { User, type UserRepository } from "../domain/index.js";

export type UpsertCurrentUserInput = {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
};

export type UpsertCurrentUserOutput = {
  userId: string;
  status: "ACTIVE";
};

export type UpsertCurrentUserDeps = {
  userRepository: UserRepository;
  clock: Clock;
};

export class UpsertCurrentUserUseCase {
  constructor(private readonly deps: UpsertCurrentUserDeps) {}

  async execute(input: UpsertCurrentUserInput): Promise<UpsertCurrentUserOutput> {
    const existing = await this.deps.userRepository.findById(input.userId);
    const now = this.deps.clock.now();

    if (existing !== undefined) {
      existing.updateProfile({
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        now,
      });
      await this.deps.userRepository.save(existing);

      return {
        userId: existing.id,
        status: "ACTIVE",
      };
    }

    const user = User.create({
      id: input.userId,
      displayName: input.displayName,
      email: input.email,
      avatarUrl: input.avatarUrl,
      now,
    });

    await this.deps.userRepository.save(user);

    return {
      userId: user.id,
      status: "ACTIVE",
    };
  }
}
