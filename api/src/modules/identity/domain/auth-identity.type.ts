export type AuthProvider = "google" | "github" | "world_id" | "passkey" | "email";

export type AuthIdentity = {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerSubject: string;
  createdAt: Date;
};
