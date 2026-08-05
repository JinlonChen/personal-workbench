import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createSeedWorkspace } from "@/data/seed";
import { rowsToWorkspace, SupabaseWorkspaceRepository, workspaceToRows } from "@/data/supabase-repository";

describe("Supabase workspace mapping", () => {
  it("maps every workspace collection to database rows with a user id", () => {
    const workspace = createSeedWorkspace("2026-07-28");
    workspace.focusProjects = [
      {
        id: "focus-1",
        name: "新型破碎主机开发",
        platformUrl: "https://projects.example.com/focus-1",
        owner: "张工",
        tier: "top",
        status: "attention",
        currentGoal: "完成关键参数方案评审",
        risk: "试验资源冲突",
        nextAction: "协调试验台排期",
        latestConclusion: "等待资源协调",
        nextReviewDate: "2026-07-30",
        createdAt: "2026-07-28T08:00:00.000Z",
        updatedAt: "2026-07-28T08:00:00.000Z",
      },
    ];
    const rows = workspaceToRows(workspace, "user-1");

    expect(rows.profile).toMatchObject({ id: "user-1", display_name: "朋友" });
    expect(rows.tasks[0]).toMatchObject({
      user_id: "user-1",
      title: "完成今天最重要的一件事",
      task_date: "2026-07-28",
    });
    expect(rows.focusProjects[0]).toMatchObject({
      user_id: "user-1",
      name: "新型破碎主机开发",
      status: "attention",
    });
    expect(rows.workEntries).toEqual([]);
    expect(rows.learningEntries).toEqual([]);
    expect(rows.dailyReviews).toEqual([]);
  });

  it("restores a workspace from database rows", () => {
    const workspace = createSeedWorkspace("2026-07-28");
    workspace.focusProjects = [
      {
        id: "focus-1",
        name: "设计手册迭代",
        platformUrl: "",
        owner: "王工",
        tier: "parallel",
        status: "on_track",
        currentGoal: "完成章节初稿",
        risk: "",
        nextAction: "周五检查初稿",
        latestConclusion: "按计划推进",
        nextReviewDate: "2026-07-31",
        createdAt: "2026-07-28T08:00:00.000Z",
        updatedAt: "2026-07-28T08:00:00.000Z",
      },
    ];
    const rows = workspaceToRows(workspace, "user-1");
    const restored = rowsToWorkspace(rows);

    expect(restored.schemaVersion).toBe(1);
    expect(restored.profile.id).toBe("user-1");
    expect(restored.tasks).toEqual(workspace.tasks);
    expect(restored.focusProjects).toEqual(workspace.focusProjects);
  });

  it("refreshes the session and retries a load after one 401 response", async () => {
    const refreshSession = vi.fn().mockResolvedValue({ data: { session: {} }, error: null });
    const attempts = new Map<string, number>();
    const from = vi.fn((table: string) => {
      const attempt = (attempts.get(table) ?? 0) + 1;
      attempts.set(table, attempt);
      const failed = table === "daily_reviews" && attempt === 1;
      const result = failed
        ? { data: null, error: { message: "{}" }, status: 401 }
        : { data: table === "profiles" ? null : [], error: null, status: 200 };
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(() => Promise.resolve(result)),
        maybeSingle: vi.fn(() => Promise.resolve(result)),
      };
      return query;
    });
    const client = { auth: { refreshSession }, from } as unknown as SupabaseClient;

    const workspace = await new SupabaseWorkspaceRepository(client, "user-1").load();

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledTimes(12);
    expect(workspace.profile.id).toBe("user-1");
  });
});
