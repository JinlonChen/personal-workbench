import { describe, expect, it } from "vitest";

import { isLocalModeRequested } from "@/data/local-mode";

describe("isLocalModeRequested", () => {
  it("enables local mode only when local is 1", () => {
    expect(isLocalModeRequested("?local=1")).toBe(true);
    expect(isLocalModeRequested("?build=f2a6a8f&local=1")).toBe(true);
  });

  it("keeps cloud sign-in enabled for other URLs", () => {
    expect(isLocalModeRequested("")).toBe(false);
    expect(isLocalModeRequested("?local=true")).toBe(false);
  });
});
