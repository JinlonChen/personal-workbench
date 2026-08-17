import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSeedWorkspace } from "@/data/seed";
import { buildAssistantContext } from "@/features/ai-assistant/context";
import { requestAssistant } from "@/features/ai-assistant/client";

const supabaseMocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/data/supabase-client", () => ({
  getSupabaseClient: () => ({ functions: { invoke: supabaseMocks.invoke } }),
}));

const context = buildAssistantContext(createSeedWorkspace("2026-08-17"), "2026-08-17");

describe("AI assistant Supabase client", () => {
  beforeEach(() => supabaseMocks.invoke.mockReset());

  it("invokes the authenticated Edge Function with a trimmed prompt", async () => {
    supabaseMocks.invoke.mockResolvedValue({
      data: { kind: "answer", answer: "本周有三个任务", references: ["任务"] },
      error: null,
    });
    await expect(requestAssistant("  我本周有什么任务？ ", context)).resolves.toEqual({
      kind: "answer",
      answer: "本周有三个任务",
      references: ["任务"],
    });
    expect(supabaseMocks.invoke).toHaveBeenCalledWith("ai-assistant", {
      body: { prompt: "我本周有什么任务？", context },
    });
  });

  it("rejects empty and oversized prompts before making a request", async () => {
    await expect(requestAssistant("   ", context)).rejects.toThrow("请输入要询问或新增的内容");
    await expect(requestAssistant("问".repeat(2001), context)).rejects.toThrow("输入内容不能超过 2000 字");
    expect(supabaseMocks.invoke).not.toHaveBeenCalled();
  });

  it("rejects an invalid model response", async () => {
    supabaseMocks.invoke.mockResolvedValue({ data: { kind: "delete_task" }, error: null });
    await expect(requestAssistant("删除任务", context)).rejects.toThrow("AI 返回格式不正确");
  });

  it.each([
    [{ message: "Unauthorized", context: { status: 401 } }, "登录状态已失效，请重新登录后再试。"],
    [{ message: "AI_NOT_CONFIGURED", context: { status: 503 } }, "AI 助手尚未配置，请先在 Supabase 中设置 DeepSeek Key。"],
    [{ message: "Failed to send a request to the Edge Function" }, "无法连接 AI 服务，请检查网络后重试。"],
  ])("translates service errors into readable messages", async (error, message) => {
    supabaseMocks.invoke.mockResolvedValue({ data: null, error });
    await expect(requestAssistant("本周任务", context)).rejects.toThrow(message);
  });
});
