import { describe, expect, it, vi } from "vitest";

import { createId } from "@/domain/id";

describe("createId", () => {
  it("uses the native randomUUID implementation when available", () => {
    const randomUUID = vi.fn(() => "00000000-0000-4000-8000-000000000000");

    expect(createId({ randomUUID })).toBe("00000000-0000-4000-8000-000000000000");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("creates a UUID v4 when randomUUID is unavailable", () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.fill(0xab);
      return bytes;
    });

    expect(createId({ getRandomValues })).toBe("abababab-abab-4bab-abab-abababababab");
    expect(getRandomValues).toHaveBeenCalledOnce();
  });
});
