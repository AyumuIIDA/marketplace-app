import type { User } from "./user.entity.js";

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(userId: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
}
