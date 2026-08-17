import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSeedWorkspace } from "@/data/seed";
import { Assistant } from "@/features/ai-assistant/assistant";

const mocks = vi.hoisted(() => ({
  auth: { status: "signed_in", session: { user: { id: "user-1" } } } as Record<string, unknown>,
  workspace: {} as Record<string, unknown>,
  requestAssistant: vi.fn(),
  createTask: vi.fn(),
  createRecurringPlan: vi.fn(),
  createFocusProject: vi.fn(),
  createWorkEntry: vi.fn(),
  createLearningEntry: vi.fn(),
}));

vi.mock("@/state/auth-provider", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/state/workspace-provider", () => ({ useWorkspace: () => mocks.workspace }));
vi.mock("@/features/ai-assistant/client", () => ({
  requestAssistant: (...args: unknown[]) => mocks.requestAssistant(...args),
}));

describe("AI assistant panel", () => {
  beforeEach(() => {
    mocks.auth.status = "signed_in";
    mocks.auth.session = { user: { id: "user-1" } };
    mocks.requestAssistant.mockReset();
    for (const handler of [mocks.createTask, mocks.createRecurringPlan, mocks.createFocusProject, mocks.createWorkEntry, mocks.createLearningEntry]) {
      handler.mockReset().mockResolvedValue(undefined);
    }
    mocks.workspace = {
      workspace: createSeedWorkspace("2026-08-17"),
      createTask: mocks.createTask,
      createRecurringPlan: mocks.createRecurringPlan,
      createFocusProject: mocks.createFocusProject,
      createWorkEntry: mocks.createWorkEntry,
      createLearningEntry: mocks.createLearningEntry,
    };
  });

  it("opens and closes from the double-dragon button", async () => {
    const user = userEvent.setup();
    render(<Assistant />);
    await user.click(screen.getByRole("button", { name: "打开 AI 助手" }));
    expect(screen.getByRole("dialog", { name: "龍序 AI 助手" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "关闭 AI 助手" }));
    expect(screen.queryByRole("dialog", { name: "龍序 AI 助手" })).not.toBeInTheDocument();
  });

  it("asks local-mode users to sign in", async () => {
    mocks.auth.status = "signed_out";
    mocks.auth.session = null;
    const user = userEvent.setup();
    render(<Assistant />);
    await user.click(screen.getByRole("button", { name: "打开 AI 助手" }));
    expect(screen.getByText("登录云端账号后使用 AI 助手")).toBeInTheDocument();
    expect(screen.queryByLabelText("给 AI 助手发送消息")).not.toBeInTheDocument();
  });

  it("shows a data-backed answer", async () => {
    mocks.requestAssistant.mockResolvedValue({ kind: "answer", answer: "本周有三个任务。", references: ["任务", "周期计划"] });
    const user = userEvent.setup();
    render(<Assistant />);
    await user.click(screen.getByRole("button", { name: "打开 AI 助手" }));
    await user.type(screen.getByLabelText("给 AI 助手发送消息"), "我本周有什么任务？");
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("本周有三个任务。")).toBeInTheDocument();
    expect(screen.getByText("依据：任务、周期计划")).toBeInTheDocument();
  });

  it("does not save a draft until the user confirms", async () => {
    mocks.requestAssistant.mockResolvedValue({
      kind: "draft_actions",
      summary: "准备新增任务",
      actions: [{
        type: "create_task",
        data: { title: "跟踪颚破项目", description: "", taskDate: "2026-08-20", priority: "medium" },
      }],
    });
    const user = userEvent.setup();
    render(<Assistant />);
    await user.click(screen.getByRole("button", { name: "打开 AI 助手" }));
    await user.type(screen.getByLabelText("给 AI 助手发送消息"), "8.20 日跟踪颚破项目");
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("待确认新增")).toBeInTheDocument();
    expect(screen.getByText("跟踪颚破项目")).toBeInTheDocument();
    expect(mocks.createTask).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认添加" }));
    await waitFor(() => expect(mocks.createTask).toHaveBeenCalledTimes(1));
    expect(screen.getByText("已添加并同步")).toBeInTheDocument();
  });

  it("keeps the input after a request failure", async () => {
    mocks.requestAssistant.mockRejectedValue(new Error("无法连接 AI 服务，请检查网络后重试。"));
    const user = userEvent.setup();
    render(<Assistant />);
    await user.click(screen.getByRole("button", { name: "打开 AI 助手" }));
    const input = screen.getByLabelText("给 AI 助手发送消息");
    await user.type(input, "查询本周任务");
    await user.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("无法连接 AI 服务，请检查网络后重试。");
    expect(input).toHaveValue("查询本周任务");
  });
});
