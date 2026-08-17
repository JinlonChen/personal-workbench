import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "@/data/local-repository";
import type { TaskInput, Workspace } from "@/domain/types";
import { WorkspaceProvider, useWorkspace } from "@/state/workspace-provider";

vi.mock("@/state/auth-provider", () => ({
  useAuth: () => ({ configured: false, session: null, status: "signed_out" }),
}));

const taskDefaults: Omit<TaskInput, "title"> = {
  description: "",
  taskDate: "2026-08-17",
  priority: "medium",
  status: "todo",
  placement: "scheduled",
  backlogKind: null,
  originalTaskDate: null,
};

function SequentialCreateHarness() {
  const { createTask } = useWorkspace();
  return (
    <button
      type="button"
      onClick={async () => {
        await createTask({ ...taskDefaults, title: "连续新增一" });
        await createTask({ ...taskDefaults, title: "连续新增二" });
      }}
    >
      连续新增
    </button>
  );
}

describe("WorkspaceProvider sequential creates", () => {
  beforeEach(() => localStorage.clear());

  it("preserves every item created from one render callback", async () => {
    const user = userEvent.setup();
    render(<WorkspaceProvider><SequentialCreateHarness /></WorkspaceProvider>);
    await user.click(await screen.findByRole("button", { name: "连续新增" }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Workspace | null;
      expect(stored?.tasks.map((task) => task.title)).toEqual(expect.arrayContaining(["连续新增一", "连续新增二"]));
    });
  });
});
