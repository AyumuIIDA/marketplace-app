import type { CurrentUser } from "../../lib/api/current-user.api";

export type ShellUserLabels = {
  userLabel: string;
  humanLabel: string;
};

export function toShellUserLabels(currentUser: CurrentUser | undefined): ShellUserLabels {
  return {
    userLabel: currentUser?.displayName ?? "Guest preview",
    humanLabel:
      currentUser === undefined ? "Link after sign in" : currentUser.humanVerified ? "Verified" : "Not linked",
  };
}
