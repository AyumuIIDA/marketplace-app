import { DomainError } from "../../../shared/index.js";

export type WorldIdVerificationProps = {
  id: string;
  userId: string;
  action: string;
  nullifierHash: string;
  verificationLevel: string;
  signalHash?: string;
  environment: string;
  verifiedAt: Date;
  createdAt: Date;
};

export type CreateWorldIdVerificationProps = {
  id: string;
  userId: string;
  action: string;
  nullifierHash: string;
  verificationLevel: string;
  signalHash?: string;
  environment: string;
  verifiedAt: Date;
  now: Date;
};

export class WorldIdVerification {
  private constructor(private props: WorldIdVerificationProps) {}

  static create(input: CreateWorldIdVerificationProps): WorldIdVerification {
    validateRequiredText("userId", input.userId);
    validateRequiredText("action", input.action);
    validateRequiredText("nullifierHash", input.nullifierHash);
    validateRequiredText("verificationLevel", input.verificationLevel);
    validateRequiredText("environment", input.environment);

    return new WorldIdVerification({
      id: input.id,
      userId: input.userId,
      action: input.action,
      nullifierHash: input.nullifierHash,
      verificationLevel: input.verificationLevel,
      signalHash: input.signalHash,
      environment: input.environment,
      verifiedAt: input.verifiedAt,
      createdAt: input.now,
    });
  }

  static rehydrate(props: WorldIdVerificationProps): WorldIdVerification {
    return new WorldIdVerification({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get action(): string {
    return this.props.action;
  }

  get snapshot(): WorldIdVerificationProps {
    return { ...this.props };
  }
}

function validateRequiredText(field: string, value: string): void {
  if (value.trim().length === 0) {
    throw new DomainError("WORLD_ID_VERIFICATION_FIELD_REQUIRED", `${field} is required.`, {
      field,
    });
  }
}

