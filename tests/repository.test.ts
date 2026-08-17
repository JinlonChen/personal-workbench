import { beforeEach, describe, expect, it } from "vitest";

import { LocalWorkspaceRepository, STORAGE_KEY } from "@/data/local-repository";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("LocalWorkspaceRepository", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("seeds an empty store and persists updates", async () => {
    const repository = new LocalWorkspaceRepository(storage);
    const initial = await repository.load();
    expect(initial.schemaVersion).toBe(3);
    expect(initial.focusSessions).toEqual([]);
    expect(initial.tasks.length).toBeGreaterThan(0);

    initial.profile.displayName = "金龙";
    await repository.save(initial);

    expect((await repository.load()).profile.displayName).toBe("金龙");
  });

  it("migrates unversioned persisted data", async () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: { displayName: "旧数据", timezone: "Asia/Shanghai" },
        tasks: [],
        workEntries: [],
        learningEntries: [],
        dailyReviews: [],
      }),
    );

    const workspace = await new LocalWorkspaceRepository(storage).load();
    expect(workspace.schemaVersion).toBe(3);
    expect(workspace.profile.displayName).toBe("旧数据");
    expect(workspace.profile.id).toBe("local-user");
    expect(workspace.focusProjects).toEqual([]);
    expect(workspace.focusSessions).toEqual([]);
  });

  it("adds ordinary scheduled placement to legacy tasks", async () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: { displayName: "旧数据", timezone: "Asia/Shanghai" },
        tasks: [{ id: "task-1", title: "保留任务", taskDate: "2026-08-13", status: "todo" }],
        workEntries: [],
        learningEntries: [],
        dailyReviews: [],
      }),
    );

    expect((await new LocalWorkspaceRepository(storage).load()).tasks[0]).toMatchObject({
      placement: "scheduled",
      backlogKind: null,
      originalTaskDate: null,
    });
  });

  it("preserves existing v1 records while adding the focus-session collection", async () => {
    const seeded = {
      profile: { displayName: "旧用户", timezone: "Asia/Shanghai" },
      focusProjects: [{ id: "project-1" }],
      tasks: [{ id: "task-1", title: "保留任务" }],
      workEntries: [{ id: "work-1", title: "保留记录" }],
      learningEntries: [{ id: "learn-1", title: "保留学习" }],
      dailyReviews: [{ id: "review-1", reviewDate: "2026-08-13" }],
      schemaVersion: 1,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(seeded));

    const workspace = await new LocalWorkspaceRepository(storage).load();

    expect(workspace.schemaVersion).toBe(3);
    expect(workspace.focusSessions).toEqual([]);
    expect(workspace.focusProjects).toEqual(seeded.focusProjects);
    expect(workspace.tasks).toEqual([{
      ...seeded.tasks[0],
      placement: "scheduled",
      backlogKind: null,
      originalTaskDate: null,
      recurringPlanId: null,
      recurrenceDueDate: null,
      source: "manual",
    }]);
    expect(workspace.workEntries).toEqual(seeded.workEntries);
    expect(workspace.learningEntries).toEqual(seeded.learningEntries);
    expect(workspace.dailyReviews).toEqual(seeded.dailyReviews);
  });

  it("reports corrupted stored data without overwriting it", async () => {
    storage.setItem(STORAGE_KEY, "not-json");
    const repository = new LocalWorkspaceRepository(storage);

    await expect(repository.load()).rejects.toThrow("本地数据无法读取");
    expect(storage.getItem(STORAGE_KEY)).toBe("not-json");
  });

  it("clears persisted workspace data", async () => {
    const repository = new LocalWorkspaceRepository(storage);
    await repository.load();
    await repository.clear();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("persists a completed session after its task association is cleared", async () => {
    const repository = new LocalWorkspaceRepository(storage);
    const workspace = await repository.load();
    const task = workspace.tasks[0];
    workspace.focusSessions = [{
      id: "session-1",
      taskId: null,
      taskTitle: task.title,
      focusDate: task.taskDate,
      plannedMinutes: 25,
      completedAt: task.updatedAt,
      createdAt: task.updatedAt,
    }];
    workspace.tasks = workspace.tasks.filter((item) => item.id !== task.id);

    await repository.save(workspace);

    expect((await repository.load()).focusSessions).toEqual(workspace.focusSessions);
  });
});
