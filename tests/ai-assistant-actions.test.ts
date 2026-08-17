import { beforeEach, describe, expect, it, vi } from "vitest";

import { executeAssistantAction, type AssistantActionHandlers } from "@/features/ai-assistant/action-executor";
import { parseAssistantResponse, type AssistantDraftAction } from "@/features/ai-assistant/protocol";

const handlers: AssistantActionHandlers = {
  createTask: vi.fn(),
  createRecurringPlan: vi.fn(),
  createFocusProject: vi.fn(),
  createWorkEntry: vi.fn(),
  createLearningEntry: vi.fn(),
};

function action(value: unknown): AssistantDraftAction {
  const response = parseAssistantResponse({ kind: "draft_actions", summary: "新增", actions: [value] });
  if (response.kind !== "draft_actions") throw new Error("测试草稿无效");
  return response.actions[0];
}

describe("AI assistant action executor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a scheduled task with a safe initial status", async () => {
    await executeAssistantAction(action({
      type: "create_task",
      data: { title: "跟踪颚破智能化项目", taskDate: "2026-08-20", priority: "high" },
    }), handlers);
    expect(handlers.createTask).toHaveBeenCalledWith({
      title: "跟踪颚破智能化项目",
      description: "",
      taskDate: "2026-08-20",
      priority: "high",
      status: "todo",
      placement: "scheduled",
      backlogKind: null,
      originalTaskDate: null,
    });
  });

  it("creates an unscheduled backlog task", async () => {
    await executeAssistantAction(action({
      type: "create_backlog_task",
      data: { title: "整理旧资料", taskDate: "2026-08-17" },
    }), handlers);
    expect(handlers.createTask).toHaveBeenCalledWith(expect.objectContaining({
      title: "整理旧资料",
      status: "todo",
      placement: "backlog",
      backlogKind: "unscheduled",
      originalTaskDate: null,
    }));
  });

  it("creates a recurring plan with existing reminder defaults", async () => {
    await executeAssistantAction(action({
      type: "create_recurring_plan",
      data: { title: "清理扫地机器人", startDate: "2026-08-20", interval: 2, unit: "week", mode: "fixed", category: "life" },
    }), handlers);
    expect(handlers.createRecurringPlan).toHaveBeenCalledWith({
      title: "清理扫地机器人",
      description: "",
      category: "life",
      startDate: "2026-08-20",
      interval: 2,
      unit: "week",
      mode: "fixed",
      missedPolicy: "latest_only",
      priority: "medium",
      inAppReminder: true,
      browserNotification: false,
      endDate: null,
    });
  });

  it("creates a focus project", async () => {
    await executeAssistantAction(action({
      type: "create_focus_project",
      data: { name: "颚破智能化", tier: "top", status: "attention", currentGoal: "完成阶段跟踪", nextReviewDate: "2026-08-20" },
    }), handlers);
    expect(handlers.createFocusProject).toHaveBeenCalledWith(expect.objectContaining({
      name: "颚破智能化",
      tier: "top",
      status: "attention",
      currentGoal: "完成阶段跟踪",
      nextReviewDate: "2026-08-20",
    }));
  });

  it("creates a work entry without linking it to an existing task", async () => {
    await executeAssistantAction(action({
      type: "create_work_entry",
      data: { entryDate: "2026-08-17", title: "项目沟通", content: "确认节点", result: "排期明确", tags: ["项目"] },
    }), handlers);
    expect(handlers.createWorkEntry).toHaveBeenCalledWith({
      entryDate: "2026-08-17",
      title: "项目沟通",
      content: "确认节点",
      result: "排期明确",
      taskId: null,
      tags: ["项目"],
    });
  });

  it("creates a learning entry", async () => {
    await executeAssistantAction(action({
      type: "create_learning_entry",
      data: { entryDate: "2026-08-17", title: "方案学习", content: "阅读资料", keyPoints: "整理接口", nextAction: "实践", tags: ["AI"] },
    }), handlers);
    expect(handlers.createLearningEntry).toHaveBeenCalledWith({
      entryDate: "2026-08-17",
      title: "方案学习",
      content: "阅读资料",
      sourceUrl: "",
      keyPoints: "整理接口",
      nextAction: "实践",
      tags: ["AI"],
    });
  });
});
