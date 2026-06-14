import type { AuthIdentity, AuthProvider } from "./auth-identity.type.js";

export type CreateAuthIdentityInput = {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerSubject: string;
  createdAt: Date;
};

export interface AuthIdentityRepository {
  save(input: CreateAuthIdentityInput): Promise<AuthIdentity>;
  findByProviderSubject(
    provider: AuthProvider,
    providerSubject: string,
  ): Promise<AuthIdentity | undefined>;
}
