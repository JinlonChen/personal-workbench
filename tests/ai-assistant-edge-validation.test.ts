import { describe, expect, it } from "vitest";

import { createSeedWorkspace } from "@/data/seed";
import { buildAssistantContext } from "@/features/ai-assistant/context";
import {
  getModelResponseValidationErrors,
  normalizeModelResponse,
  validateAssistantContext,
  validateModelResponse,
} from "../supabase/functions/ai-assistant/index";

const validTask = {
  type: "create_task",
  data: {
    title: "跟踪项目",
    description: "确认当前进展",
    taskDate: "2026-08-20",
    priority: "medium",
  },
};

describe("AI assistant Edge Function response validation", () => {
  it("accepts only the minimized context schema and collection limits", () => {
    const context = buildAssistantContext(createSeedWorkspace("2026-08-17"), "2026-08-17");
    expect(validateAssistantContext(context)).toBe(true);
    expect(validateAssistantContext({ ...context, hidden: "不应转发" })).toBe(false);
    expect(validateAssistantContext({ ...context, tasks: Array.from({ length: 201 }, () => context.tasks[0]) })).toBe(false);
    expect(validateAssistantContext({
      ...context,
      workEntries: [{ entryDate: "2026-08-17", title: "记录", summary: "长".repeat(241) }],
    })).toBe(false);
  });

  it("accepts a complete supported action", () => {
    expect(validateModelResponse({
      kind: "draft_actions",
      summary: "准备新增任务",
      actions: [validTask],
    })).toBe(true);
  });

  it("wraps the single-action shape returned by DeepSeek", () => {
    const normalized = normalizeModelResponse({
      kind: "create_task",
      data: validTask.data,
    });

    expect(normalized).toEqual({
      kind: "draft_actions",
      summary: "待确认新增 1 项内容",
      actions: [validTask],
    });
    expect(validateModelResponse(normalized)).toBe(true);
  });

  it("rejects invalid action fields before they reach the browser", () => {
    expect(validateModelResponse({
      kind: "draft_actions",
      summary: "准备新增任务",
      actions: [{ ...validTask, data: { ...validTask.data, title: "" } }],
    })).toBe(false);
    expect(validateModelResponse({
      kind: "draft_actions",
      summary: "准备新增任务",
      actions: [{ ...validTask, data: { ...validTask.data, taskDate: "2026-02-30" } }],
    })).toBe(false);
    expect(validateModelResponse({
      kind: "draft_actions",
      summary: "准备新增任务",
      actions: [{ ...validTask, data: { ...validTask.data, description: "长".repeat(4001) } }],
    })).toBe(false);
  });

  it("reports invalid response fields without including their values", () => {
    const response = {
      kind: "draft_actions",
      summary: "准备新增项目",
      actions: [{
        type: "create_focus_project",
        data: { name: "敏感项目名称", nextReviewDate: "2026-8-20" },
      }],
    };

    const errors = getModelResponseValidationErrors(response);

    expect(errors).toContain("actions[0].data.nextReviewDate:invalid_date");
    expect(errors.join(" ")).not.toContain("敏感项目名称");
    expect(errors.join(" ")).not.toContain("2026-8-20");
  });

  it("reports only a safe unsupported kind token", () => {
    expect(getModelResponseValidationErrors({ kind: "create_task", data: { title: "敏感标题", taskDate: "2026-08-20" } }))
      .toEqual(["kind:unsupported:create_task", "keys:data,kind", "data_keys:taskDate,title"]);
    expect(getModelResponseValidationErrors({ kind: "敏感内容", data: {} }))
      .toEqual(["kind:unsupported:string", "keys:data,kind", "data_keys:none"]);
  });

  it("rejects malformed answers and references", () => {
    expect(validateModelResponse({ kind: "answer", answer: "有两项任务", references: [42] })).toBe(false);
    expect(validateModelResponse({ kind: "answer", answer: "答".repeat(4001), references: [] })).toBe(false);
  });
});
