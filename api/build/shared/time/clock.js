export class SystemClock {
    now() {
        return new Date();
    }
}
export class FixedClock {
    current;
    constructor(current) {
        this.current = current;
    }
    now() {
        return new Date(this.current);
    }
}
