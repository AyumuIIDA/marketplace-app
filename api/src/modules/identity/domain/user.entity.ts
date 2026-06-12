import { DomainError } from "../../../shared/index.js";

import type { UserStatus } from "./user-status.type.js";

export type UserProps = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserProps = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  now: Date;
};

export class User {
  private constructor(private props: UserProps) {}

  static create(input: CreateUserProps): User {
    validateUserText("displayName", input.displayName);
    validateEmail(input.email);

    return new User({
      id: input.id,
      displayName: input.displayName,
      email: input.email,
      avatarUrl: input.avatarUrl,
      status: "ACTIVE",
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static rehydrate(props: UserProps): User {
    return new User({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get snapshot(): UserProps {
    return { ...this.props };
  }

  updateProfile(input: { displayName: string; avatarUrl?: string; now: Date }): void {
    validateUserText("displayName", input.displayName);

    this.props = {
      ...this.props,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      updatedAt: input.now,
    };
  }

  suspend(now: Date): void {
    this.props = {
      ...this.props,
      status: "SUSPENDED",
      updatedAt: now,
    };
  }
}

export function validateUserText(field: "displayName", value: string): void {
  if (value.trim().length === 0) {
    throw new DomainError("USER_FIELD_REQUIRED", `${field} is required.`, { field });
  }
}

export function validateEmail(email: string): void {
  if (!email.includes("@") || email.trim().length === 0) {
    throw new DomainError("USER_EMAIL_INVALID", "User email is invalid.", { email });
  }
}
