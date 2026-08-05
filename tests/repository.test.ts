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
    expect(initial.schemaVersion).toBe(1);
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
    expect(workspace.schemaVersion).toBe(1);
    expect(workspace.profile.displayName).toBe("旧数据");
    expect(workspace.profile.id).toBe("local-user");
    expect(workspace.focusProjects).toEqual([]);
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
});
