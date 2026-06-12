import { User } from "../domain/index.js";
export class UpsertCurrentUserUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
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
