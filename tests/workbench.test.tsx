import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import Home from "@/app/page";
import { savePomodoro, startPomodoro } from "@/features/pomodoro-state";

describe("workbench navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("navigates among the six workbench views", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "今日工作台" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "关注" }));
    expect(screen.getByRole("heading", { name: "重点关注" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "任务" }));
    expect(screen.getByRole("heading", { name: "任务" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "记录" }));
    expect(screen.getByRole("heading", { name: "记录" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "复盘" }));
    expect(screen.getByRole("heading", { name: "每日复盘" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "设置" }));
    expect(screen.getByRole("heading", { name: "设置" })).toBeInTheDocument();
  });

  it("manages a focus project and turns its next action into today's task", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByRole("heading", { name: "今日工作台" });
    await user.click(screen.getByRole("button", { name: "关注" }));
    expect(screen.getByText("还没有重点关注项目")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新增关注项目" }));
    await user.type(screen.getByLabelText("项目名称"), "新型破碎主机开发");
    await user.type(screen.getByLabelText("负责人"), "张工");
    await user.type(screen.getByLabelText("本周目标或当前节点"), "完成关键参数方案评审");
    await user.type(screen.getByLabelText("我的下一步"), "协调试验台排期");
    await user.click(screen.getByRole("button", { name: "保存项目" }));

    expect(await screen.findByText("新型破碎主机开发")).toBeInTheDocument();
    expect(screen.getAllByText("张工").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "编辑 新型破碎主机开发" }));
    const ownerInput = screen.getByLabelText("负责人");
    await user.clear(ownerInput);
    await user.type(ownerInput, "李工");
    await user.click(screen.getByRole("button", { name: "保存项目" }));
    expect((await screen.findAllByText("李工")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "将 协调试验台排期 加入今日任务" }));
    await user.click(screen.getByRole("button", { name: "任务" }));
    expect(await screen.findByText("协调试验台排期")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "关注" }));
    await user.click(screen.getByRole("button", { name: "删除 新型破碎主机开发" }));
    expect(screen.getByRole("dialog", { name: "确认删除重点项目" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    expect(screen.queryByText("新型破碎主机开发")).not.toBeInTheDocument();
  });

  it("creates and completes a task", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByRole("heading", { name: "今日工作台" });
    await user.click(screen.getByRole("button", { name: "任务" }));
    await user.click(screen.getByRole("button", { name: "新建任务" }));
    await user.type(screen.getByLabelText("任务标题"), "完成产品原型");
    await user.click(screen.getByRole("button", { name: "保存任务" }));

    expect(await screen.findByText("完成产品原型")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "完成产品原型" }));
    const taskRow = screen.getByText("完成产品原型").closest("article");
    expect(taskRow).not.toBeNull();
    expect(within(taskRow!).getByText("已完成")).toBeInTheDocument();
  });

  it("rolls an unfinished task to the next day", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByRole("heading", { name: "今日工作台" });
    await user.click(screen.getByRole("button", { name: "任务" }));
    const title = "整理一条工作记录";
    await user.click(screen.getByRole("button", { name: `顺延 ${title}` }));

    expect(screen.queryByText(title)).not.toBeInTheDocument();
  });

  it("requires confirmation before deleting a task", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByRole("heading", { name: "今日工作台" });
    await user.click(screen.getByRole("button", { name: "任务" }));
    const title = "整理一条工作记录";
    await user.click(screen.getByRole("button", { name: `删除 ${title}` }));
    expect(screen.getByRole("dialog", { name: "确认删除任务" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    expect(screen.queryByText(title)).not.toBeInTheDocument();
  });

  it("creates work and learning records and filters by keyword", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByRole("heading", { name: "今日工作台" });
    await user.click(screen.getByRole("button", { name: "记录" }));
    await user.click(screen.getByRole("button", { name: "新建记录" }));
    await user.type(screen.getByLabelText("工作标题"), "完成登录流程");
    await user.type(screen.getByLabelText("工作内容"), "梳理并实现登录交互");
    await user.click(screen.getByRole("button", { name: "保存工作记录" }));
    expect(await screen.findByText("完成登录流程")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "学习记录" }));
    await user.click(screen.getByRole("button", { name: "新建记录" }));
    await user.type(screen.getByLabelText("学习标题"), "理解 RLS 策略");
    await user.type(screen.getByLabelText("学习内容"), "学习 auth.uid 权限边界");
    await user.click(screen.getByRole("button", { name: "保存学习记录" }));
    expect(await screen.findByText("理解 RLS 策略")).toBeInTheDocument();

    await user.type(screen.getByLabelText("搜索记录"), "RLS");
    expect(screen.getByText("理解 RLS 策略")).toBeInTheDocument();
    expect(screen.queryByText("完成登录流程")).not.toBeInTheDocument();
  });

  it("saves one review per date and shows its summary", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByRole("heading", { name: "今日工作台" });
    await user.click(screen.getByRole("button", { name: "复盘" }));
    await user.type(screen.getByLabelText("今天完成了什么"), "完成 MVP 交互");
    await user.type(screen.getByLabelText("今天最重要的收获"), "保持单一主线");
    await user.click(screen.getByRole("button", { name: "保存复盘" }));

    const history = screen.getByText("最近复盘").closest("aside");
    expect(history).not.toBeNull();
    expect(within(history!).getByText("完成 MVP 交互")).toBeInTheDocument();
    expect(within(history!).getByText("保持单一主线")).toBeInTheDocument();
  });

  it("offers exports and requires confirmation before clearing data", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByRole("heading", { name: "今日工作台" });
    await user.click(screen.getByRole("button", { name: "设置" }));
    expect(screen.getByRole("button", { name: "导出 JSON" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "导出 Markdown" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "清空本地数据" }));
    expect(screen.getByRole("dialog", { name: "确认清空数据" })).toBeInTheDocument();
  });

  it("starts a Pomodoro for today's unfinished task and abandons without saving", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByRole("heading", { name: "今日工作台" });
    expect(screen.getByRole("option", { name: "整理一条工作记录" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "晚上用两分钟复盘" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("专注任务"), "整理一条工作记录");
    await user.click(screen.getByRole("button", { name: "开始专注" }));

    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
    const taskRow = screen.getByRole("heading", { name: "整理一条工作记录", level: 3 }).closest("article");
    expect(taskRow).not.toBeNull();
    expect(within(taskRow!).getByText("进行中")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "放弃" }));
    expect(screen.getByRole("button", { name: "开始专注" })).toBeInTheDocument();
    expect(screen.getByText("今日完成 0 个番茄 · 0 分钟")).toBeInTheDocument();
  });

  it("requires confirmation before a completed Pomodoro is counted", async () => {
    const user = userEvent.setup();
    const firstRender = render(<Home />);

    await screen.findByRole("heading", { name: "今日工作台" });
    const option = screen.getByRole("option", { name: "整理一条工作记录" }) as HTMLOptionElement;
    const expired = startPomodoro(
      { id: option.value, title: "整理一条工作记录" },
      15,
      Date.now() - 16 * 60_000,
    );
    savePomodoro(localStorage, expired);
    firstRender.unmount();
    render(<Home />);

    expect(await screen.findByRole("button", { name: "完成并计入" })).toBeInTheDocument();
    expect(screen.getByText("今日完成 0 个番茄 · 0 分钟")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "完成并计入" }));
    expect(await screen.findByText("今日完成 1 个番茄 · 15 分钟")).toBeInTheDocument();
    const taskRow = screen.getByRole("heading", { name: "整理一条工作记录", level: 3 }).closest("article");
    expect(within(taskRow!).getByText("15 分钟专注")).toBeInTheDocument();
  });
});
