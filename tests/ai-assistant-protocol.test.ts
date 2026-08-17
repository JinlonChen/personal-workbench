import { describe, expect, it } from "vitest";

import { parseAssistantResponse } from "@/features/ai-assistant/protocol";

const task = {
  type: "create_task",
  data: {
    title: "跟踪颚破智能化项目",
    description: "确认本周进展",
    taskDate: "2026-08-20",
    priority: "medium",
  },
};

describe("AI assistant response protocol", () => {
  it("accepts an answer and trims its fields", () => {
    expect(parseAssistantResponse({
      kind: "answer",
      answer: "  本周有两个项目  ",
      references: [" 关注项目 ", "本周任务"],
    })).toEqual({
      kind: "answer",
      answer: "本周有两个项目",
      references: ["关注项目", "本周任务"],
    });
  });

  it("accepts a clarification", () => {
    expect(parseAssistantResponse({ kind: "clarification", question: "请问是哪一天？" })).toEqual({
      kind: "clarification",
      question: "请问是哪一天？",
    });
  });

  it.each([
    task,
    { ...task, type: "create_backlog_task" },
    {
      type: "create_recurring_plan",
      data: {
        title: "清理扫地机器人",
        startDate: "2026-08-20",
        interval: 2,
        unit: "week",
        mode: "fixed",
        category: "life",
      },
    },
    {
      type: "create_focus_project",
      data: {
        name: "颚破智能化",
        tier: "top",
        status: "on_track",
        currentGoal: "完成阶段跟踪",
        nextReviewDate: "2026-08-20",
      },
    },
    {
      type: "create_work_entry",
      data: {
        entryDate: "2026-08-17",
        title: "颚破项目沟通",
        content: "确认项目节点",
        tags: ["项目"],
      },
    },
    {
      type: "create_learning_entry",
      data: {
        entryDate: "2026-08-17",
        title: "智能化方案学习",
        content: "整理关键知识",
        tags: ["学习"],
      },
    },
  ])("accepts supported draft action $type", (action) => {
    const result = parseAssistantResponse({
      kind: "draft_actions",
      summary: "准备新增一项内容",
      actions: [action],
    });
    expect(result.kind).toBe("draft_actions");
    if (result.kind === "draft_actions") expect(result.actions[0].type).toBe(action.type);
  });

  it("rejects empty titles and impossible calendar dates", () => {
    expect(() => parseAssistantResponse({
      kind: "draft_actions",
      summary: "新增任务",
      actions: [{ ...task, data: { ...task.data, title: " " } }],
    })).toThrow("标题不能为空");
    expect(() => parseAssistantResponse({
      kind: "draft_actions",
      summary: "新增任务",
      actions: [{ ...task, data: { ...task.data, taskDate: "2026-02-30" } }],
    })).toThrow("日期格式无效");
  });

  it("rejects unsupported operations", () => {
    expect(() => parseAssistantResponse({
      kind: "draft_actions",
      summary: "删除任务",
      actions: [{ type: "delete_task", data: {} }],
    })).toThrow("AI 返回了不支持的操作");
  });

  it("rejects more than five actions", () => {
    expect(() => parseAssistantResponse({
      kind: "draft_actions",
      summary: "批量新增",
      actions: Array.from({ length: 6 }, () => task),
    })).toThrow("一次最多新增 5 项");
  });

  it("rejects oversized answers, titles and tag collections", () => {
    expect(() => parseAssistantResponse({
      kind: "answer",
      answer: "答".repeat(4001),
      references: [],
    })).toThrow("回答内容过长");
    expect(() => parseAssistantResponse({
      kind: "draft_actions",
      summary: "新增任务",
      actions: [{ ...task, data: { ...task.data, title: "任".repeat(201) } }],
    })).toThrow("标题不能超过 200 字");
    expect(() => parseAssistantResponse({
      kind: "draft_actions",
      summary: "新增记录",
      actions: [{
        type: "create_work_entry",
        data: { entryDate: "2026-08-17", title: "记录", content: "内容", tags: Array.from({ length: 11 }, (_, i) => `${i}`) },
      }],
    })).toThrow("标签最多 10 个");
  });
});
