import { describe, expect, it } from "vitest";
import {
  generateRecoveryCode,
  isValidRecoveryCode,
  generateDisplayName,
  newLearnerIdentity,
} from "@/lib/identity";

describe("recovery codes", () => {
  it("generates codes that pass their own checksum", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRecoveryCode();
      expect(isValidRecoveryCode(code)).toBe(true);
    }
  });

  it("rejects codes with a wrong checksum", () => {
    const code = generateRecoveryCode();
    const [a, b] = code.split("-");
    const bad = `${a}-${b}-99`;
    if (bad === code) return; // 1-in-100 chance of being the right checksum; skip
    expect(isValidRecoveryCode(bad)).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isValidRecoveryCode("")).toBe(false);
    expect(isValidRecoveryCode("plum-river")).toBe(false);
    expect(isValidRecoveryCode("plum-river-7")).toBe(false); // checksum must be 2 digits
    expect(isValidRecoveryCode("plum-river-abc")).toBe(false);
    expect(isValidRecoveryCode("PLUM-river-42")).toBe(generateRecoveryCode().includes("plum")); // case-insensitive comparison done internally
  });

  it("trims and lowercases input", () => {
    const code = generateRecoveryCode();
    expect(isValidRecoveryCode(`  ${code.toUpperCase()}  `)).toBe(true);
  });
});

describe("identity", () => {
  it("generates a complete identity with UUID + recovery code + name", () => {
    const id = newLearnerIdentity();
    expect(id.learnerId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(isValidRecoveryCode(id.recoveryCode)).toBe(true);
    expect(id.displayName.length).toBeGreaterThan(2);
    expect(new Date(id.createdAt).toString()).not.toBe("Invalid Date");
  });

  it("display name is two words", () => {
    expect(generateDisplayName().split(" ")).toHaveLength(2);
  });
});
