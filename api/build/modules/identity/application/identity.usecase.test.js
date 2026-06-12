import { describe, expect, it } from "vitest";
import { AuthorizationError, FixedClock, NotFoundError } from "../../../shared/index.js";
import { User } from "../domain/index.js";
import { GetCurrentUserUseCase } from "./get-current-user.usecase.js";
import { UpsertCurrentUserUseCase } from "./upsert-current-user.usecase.js";
const fixedNow = new Date("2026-06-09T00:00:00.000Z");
describe("Identity use cases", () => {
    it("should upsert and get the current user", async () => {
        const userRepository = new FakeUserRepository();
        const upsertUseCase = new UpsertCurrentUserUseCase({
            userRepository,
            clock: new FixedClock(fixedNow),
        });
        const getUseCase = new GetCurrentUserUseCase({ userRepository });
        const upserted = await upsertUseCase.execute({
            userId: "user-1",
            displayName: "Seller One",
            email: "seller@example.com",
        });
        const current = await getUseCase.execute({ userId: "user-1" });
        expect(upserted).toEqual({
            userId: "user-1",
            status: "ACTIVE",
        });
        expect(current).toMatchObject({
            userId: "user-1",
            displayName: "Seller One",
            email: "seller@example.com",
            status: "ACTIVE",
        });
    });
    it("should reject a missing current user", async () => {
        const useCase = new GetCurrentUserUseCase({
            userRepository: new FakeUserRepository(),
        });
        await expect(useCase.execute({ userId: "missing-user" })).rejects.toThrow(NotFoundError);
    });
    it("should reject a suspended current user", async () => {
        const userRepository = new FakeUserRepository();
        const user = User.create({
            id: "user-1",
            displayName: "Seller One",
            email: "seller@example.com",
            now: fixedNow,
        });
        user.suspend(fixedNow);
        await userRepository.save(user);
        const useCase = new GetCurrentUserUseCase({ userRepository });
        await expect(useCase.execute({ userId: "user-1" })).rejects.toThrow(AuthorizationError);
    });
});
class FakeUserRepository {
    users = new Map();
    async save(user) {
        this.users.set(user.id, user);
    }
    async findById(userId) {
        return this.users.get(userId);
    }
    async findByEmail(email) {
        return [...this.users.values()].find((user) => user.snapshot.email === email);
    }
}
