import { randomUUID } from "node:crypto";

export interface IdGenerator {
  newId(): string;
}

export class UuidGenerator implements IdGenerator {
  newId(): string {
    return randomUUID();
  }
}

export class FixedIdGenerator implements IdGenerator {
  constructor(private readonly ids: string[]) {}

  newId(): string {
    const id = this.ids.shift();

    if (!id) {
      throw new Error("FixedIdGenerator has no remaining ids.");
    }

    return id;
  }
}
