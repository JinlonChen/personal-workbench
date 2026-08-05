import type { Workspace } from "@/domain/types";

import type { WorkspaceRepository } from "./repository";
import { createSeedWorkspace } from "./seed";

export const STORAGE_KEY = "personal-workbench.workspace.v1";

type LegacyWorkspace = Partial<Workspace> & {
  profile?: Partial<Workspace["profile"]>;
};

function normalizeWorkspace(value: LegacyWorkspace): Workspace {
  const now = new Date().toISOString();
  const seed = createSeedWorkspace();
  return {
    schemaVersion: 1,
    profile: {
      id: value.profile?.id ?? "local-user",
      displayName: value.profile?.displayName?.trim() || seed.profile.displayName,
      timezone: value.profile?.timezone || "Asia/Shanghai",
      createdAt: value.profile?.createdAt ?? now,
      updatedAt: value.profile?.updatedAt ?? now,
    },
    focusProjects: Array.isArray(value.focusProjects) ? value.focusProjects : [],
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    workEntries: Array.isArray(value.workEntries) ? value.workEntries : [],
    learningEntries: Array.isArray(value.learningEntries) ? value.learningEntries : [],
    dailyReviews: Array.isArray(value.dailyReviews) ? value.dailyReviews : [],
  };
}

export class LocalWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly storage: Storage) {}

  async load(): Promise<Workspace> {
    const stored = this.storage.getItem(STORAGE_KEY);
    if (!stored) {
      const workspace = createSeedWorkspace();
      await this.save(workspace);
      return workspace;
    }

    try {
      return normalizeWorkspace(JSON.parse(stored) as LegacyWorkspace);
    } catch {
      throw new Error("本地数据无法读取，请先导出或检查浏览器存储后再重试。");
    }
  }

  async save(workspace: Workspace): Promise<void> {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify({ ...workspace, schemaVersion: 1 }));
    } catch {
      throw new Error("保存失败，浏览器存储可能不可用或空间不足。");
    }
  }

  async clear(): Promise<void> {
    this.storage.removeItem(STORAGE_KEY);
  }
}
