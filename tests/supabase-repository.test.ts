import { describe, expect, it } from "vitest";

import { createSeedWorkspace } from "@/data/seed";
import { rowsToWorkspace, workspaceToRows } from "@/data/supabase-repository";

describe("Supabase workspace mapping", () => {
  it("maps every workspace collection to database rows with a user id", () => {
    const workspace = createSeedWorkspace("2026-07-28");
    const rows = workspaceToRows(workspace, "user-1");

    expect(rows.profile).toMatchObject({ id: "user-1", display_name: "朋友" });
    expect(rows.tasks[0]).toMatchObject({
      user_id: "user-1",
      title: "完成今天最重要的一件事",
      task_date: "2026-07-28",
    });
    expect(rows.workEntries).toEqual([]);
    expect(rows.learningEntries).toEqual([]);
    expect(rows.dailyReviews).toEqual([]);
  });

  it("restores a workspace from database rows", () => {
    const workspace = createSeedWorkspace("2026-07-28");
    const rows = workspaceToRows(workspace, "user-1");
    const restored = rowsToWorkspace(rows);

    expect(restored.schemaVersion).toBe(1);
    expect(restored.profile.id).toBe("user-1");
    expect(restored.tasks).toEqual(workspace.tasks);
  });
});
