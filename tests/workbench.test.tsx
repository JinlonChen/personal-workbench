import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("workbench navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("navigates among the five workbench views", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "今日工作台" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "任务" }));
    expect(screen.getByRole("heading", { name: "任务" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "记录" }));
    expect(screen.getByRole("heading", { name: "记录" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "复盘" }));
    expect(screen.getByRole("heading", { name: "每日复盘" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "设置" }));
    expect(screen.getByRole("heading", { name: "设置" })).toBeInTheDocument();
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
});
