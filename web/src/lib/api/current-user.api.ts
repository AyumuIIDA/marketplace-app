import { bffJson, isBffError } from "./bff-client";

export type CurrentUser = {
  userId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  status: "ACTIVE" | "SUSPENDED";
  humanVerified: boolean;
  humanVerifiedAt?: string;
};

export async function getCurrentUser(): Promise<CurrentUser | undefined> {
  try {
    return await bffJson<CurrentUser>("/me");
  } catch (error) {
    if (isBffError(error) && error.status === 401) {
      return undefined;
    }

    throw error;
  }
}
