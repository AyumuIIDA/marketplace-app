import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
export class GetCurrentUserUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
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
