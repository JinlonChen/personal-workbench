import { describe, expect, it } from "vitest";

import { createSeedWorkspace } from "@/data/seed";
import { buildAssistantContext } from "@/features/ai-assistant/context";
import type { LearningEntry, WorkEntry, WorkspaceTask } from "@/domain/types";

const now = "2026-08-17T08:00:00.000Z";

function workspaceTask(index: number): WorkspaceTask {
  return {
    id: `task-${index}`,
    title: `任务 ${index}`,
    description: `说明 ${index}`,
    taskDate: "2026-08-17",
    placement: "scheduled",
    backlogKind: null,
    originalTaskDate: null,
    priority: "medium",
    status: "todo",
    source: "manual",
    recurringPlanId: null,
    recurrenceDueDate: null,
    createdAt: now,
    updatedAt: now,
  };
}

function workEntry(index: number): WorkEntry {
  return {
    id: `work-${index}`,
    entryDate: "2026-08-17",
    title: `工作 ${index}`,
    content: `${index}`.repeat(300),
    result: "完成",
    taskId: null,
    tags: ["工作"],
    createdAt: now,
    updatedAt: now,
  };
}

function learningEntry(index: number): LearningEntry {
  return {
    id: `learn-${index}`,
    entryDate: "2026-08-17",
    title: `学习 ${index}`,
    content: `${index}`.repeat(300),
    sourceUrl: "https://example.com",
    keyPoints: "关键点",
    nextAction: "继续学习",
    tags: ["学习"],
    createdAt: now,
    updatedAt: now,
  };
}

describe("AI assistant workspace context", () => {
  it("calculates calendar periods from a Monday", () => {
    const context = buildAssistantContext(createSeedWorkspace("2026-08-17"), "2026-08-17");
    expect(context.periods.week).toEqual({ start: "2026-08-17", end: "2026-08-23" });
    expect(context.periods.month).toEqual({ start: "2026-08-01", end: "2026-08-31" });
    expect(context.today).toBe("2026-08-17");
    expect(context.timezone).toBe("Asia/Shanghai");
  });

  it("keeps only allowed task fields and omits private workspace data", () => {
    const workspace = createSeedWorkspace("2026-08-17");
    const context = buildAssistantContext(workspace, "2026-08-17");
    expect(context.tasks[0]).toEqual({
      title: "完成今天最重要的一件事",
      description: "把注意力留给真正推动事情前进的工作。",
      taskDate: "2026-08-17",
      placement: "scheduled",
      backlogKind: null,
      priority: "high",
      status: "doing",
    });
    expect(context).not.toHaveProperty("profile");
    expect(context).not.toHaveProperty("dailyReviews");
    expect(context).not.toHaveProperty("focusSessions");
    expect(JSON.stringify(context)).not.toContain("local-user");
  });

  it("limits collection sizes and truncates record bodies", () => {
    const workspace = createSeedWorkspace("2026-08-17");
    workspace.tasks = Array.from({ length: 205 }, (_, index) => workspaceTask(index));
    workspace.workEntries = Array.from({ length: 35 }, (_, index) => workEntry(index));
    workspace.learningEntries = Array.from({ length: 35 }, (_, index) => learningEntry(index));
    const context = buildAssistantContext(workspace, "2026-08-17");
    expect(context.tasks).toHaveLength(200);
    expect(context.workEntries).toHaveLength(30);
    expect(context.learningEntries).toHaveLength(30);
    expect(context.workEntries[0].content.length).toBeLessThanOrEqual(240);
    expect(context.learningEntries[0].content.length).toBeLessThanOrEqual(240);
  });
});
