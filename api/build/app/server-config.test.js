import { describe, expect, it } from "vitest";
import { createServerConfig, parsePort } from "./server-config.js";
describe("server-config", () => {
    it("should use Cloud Run compatible defaults", () => {
        expect(createServerConfig({})).toEqual({
            port: 8080,
            hostname: "0.0.0.0",
        });
    });
    it("should parse a valid PORT", () => {
        expect(parsePort("3000")).toBe(3000);
    });
    it("should reject invalid PORT values", () => {
        expect(() => parsePort("0")).toThrow(Error);
        expect(() => parsePort("65536")).toThrow(Error);
        expect(() => parsePort("abc")).toThrow(Error);
    });
});
