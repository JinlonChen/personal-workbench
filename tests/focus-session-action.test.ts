import { describe, expect, it, vi } from "vitest";

import { createSeedWorkspace } from "@/data/seed";
import { persistFocusSession } from "@/state/focus-session-action";

const input = {
  id: "session-1",
  taskId: "task-1",
  taskTitle: "完成方案",
  focusDate: "2026-08-13",
  plannedMinutes: 25 as const,
  completedAt: "2026-08-13T09:25:00.000Z",
};

describe("persistFocusSession", () => {
  it("adds a new session before saving", async () => {
    const workspace = createSeedWorkspace("2026-08-13");
    const save = vi.fn().mockResolvedValue(undefined);

    await persistFocusSession(workspace, input, save, "2026-08-13T09:25:00.000Z");

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].focusSessions).toEqual([
      { ...input, createdAt: "2026-08-13T09:25:00.000Z" },
    ]);
  });

  it("retries saving an existing session without duplicating it", async () => {
    const workspace = createSeedWorkspace("2026-08-13");
    workspace.focusSessions = [{ ...input, createdAt: "2026-08-13T09:25:00.000Z" }];
    const save = vi.fn().mockResolvedValue(undefined);

    await persistFocusSession(workspace, input, save);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].focusSessions).toHaveLength(1);
  });
});
