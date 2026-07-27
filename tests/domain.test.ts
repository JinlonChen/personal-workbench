import { describe, expect, it } from "vitest";

import { nextDate, todayKey } from "@/domain/date";
import { exportMarkdown } from "@/domain/export";
import {
  completionRate,
  filterLearningEntries,
  filterWorkEntries,
  reviewStreak,
  rollTask,
  tasksForDate,
} from "@/domain/selectors";
import type { Workspace, WorkspaceTask } from "@/domain/types";

const now = "2026-07-27T08:00:00.000Z";

const task = (overrides: Partial<WorkspaceTask>): WorkspaceTask => ({
  id: crypto.randomUUID(),
  title: "默认任务",
  description: "",
  taskDate: "2026-07-27",
  priority: "medium",
  status: "todo",
  source: "manual",
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const workspace: Workspace = {
  schemaVersion: 1,
  profile: {
    id: "local-user",
    displayName: "金龙",
    timezone: "Asia/Shanghai",
    createdAt: now,
    updatedAt: now,
  },
  tasks: [
    task({ id: "one", title: "完成方案", status: "done" }),
    task({ id: "two", title: "复核数据", status: "todo" }),
    task({ id: "three", title: "明日事项", taskDate: "2026-07-28" }),
  ],
  workEntries: [
    {
      id: "work-one",
      entryDate: "2026-07-27",
      title: "完成登录流程",
      content: "实现邮箱链接交互",
      result: "流程可用",
      taskId: null,
      tags: ["产品", "登录"],
      createdAt: now,
      updatedAt: now,
    },
  ],
  learningEntries: [
    {
      id: "learn-one",
      entryDate: "2026-07-27",
      title: "理解 RLS 策略",
      content: "学习 auth.uid 权限边界",
      sourceUrl: "https://supabase.com/docs",
      keyPoints: "策略必须覆盖所有操作",
      nextAction: "补充 SQL 测试",
      tags: ["Supabase"],
      createdAt: now,
      updatedAt: now,
    },
  ],
  dailyReviews: [
    {
      id: "review-one",
      reviewDate: "2026-07-27",
      completedSummary: "完成工作台",
      mainGain: "保持专注",
      blockers: "无",
      improvement: "更早开始",
      tomorrowFocus: "验证移动端",
      mood: "good",
      energy: 4,
      notes: "",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "review-two",
      reviewDate: "2026-07-26",
      completedSummary: "完成设计",
      mainGain: "边界清晰",
      blockers: "无",
      improvement: "减少切换",
      tomorrowFocus: "开始开发",
      mood: "steady",
      energy: 3,
      notes: "",
      createdAt: now,
      updatedAt: now,
    },
  ],
};

describe("date helpers", () => {
  it("formats a date in the selected timezone", () => {
    expect(todayKey("Asia/Shanghai", new Date("2026-07-26T16:30:00.000Z"))).toBe("2026-07-27");
  });

  it("moves a calendar date forward without timezone drift", () => {
    expect(nextDate("2026-12-31")).toBe("2027-01-01");
  });
});

describe("workspace selectors", () => {
  it("filters today's tasks and calculates completion", () => {
    expect(tasksForDate(workspace.tasks, "2026-07-27")).toHaveLength(2);
    expect(completionRate(workspace.tasks, "2026-07-27")).toBe(50);
  });

  it("excludes cancelled tasks from completion", () => {
    const tasks = [...workspace.tasks, task({ status: "cancelled" })];
    expect(completionRate(tasks, "2026-07-27")).toBe(50);
  });

  it("rolls an unfinished task to the next date", () => {
    const rolled = rollTask(workspace.tasks[1], "2026-07-28", now);
    expect(rolled.taskDate).toBe("2026-07-28");
    expect(rolled.status).toBe("todo");
    expect(rolled.updatedAt).toBe(now);
  });

  it("filters both record types by keyword and tags", () => {
    expect(filterWorkEntries(workspace.workEntries, { keyword: "登录", tag: "产品" })).toHaveLength(1);
    expect(filterLearningEntries(workspace.learningEntries, { keyword: "RLS", tag: "Supabase" })).toHaveLength(1);
    expect(filterLearningEntries(workspace.learningEntries, { keyword: "不存在" })).toHaveLength(0);
  });

  it("counts consecutive reviews ending on the reference date", () => {
    expect(reviewStreak(workspace.dailyReviews, "2026-07-27")).toBe(2);
  });
});

describe("exports", () => {
  it("exports readable Markdown with all record groups", () => {
    const markdown = exportMarkdown(workspace);
    expect(markdown).toContain("# 一页 · 个人工作台导出");
    expect(markdown).toContain("完成方案");
    expect(markdown).toContain("完成登录流程");
    expect(markdown).toContain("理解 RLS 策略");
    expect(markdown).toContain("完成工作台");
  });
});
