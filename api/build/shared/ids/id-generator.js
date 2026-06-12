import { randomUUID } from "node:crypto";
export class UuidGenerator {
    newId() {
        return randomUUID();
    }
}
export class FixedIdGenerator {
    ids;
    constructor(ids) {
        this.ids = ids;
    }
    newId() {
        const id = this.ids.shift();
        if (!id) {
            throw new Error("FixedIdGenerator has no remaining ids.");
        }
        return id;
    }
}
