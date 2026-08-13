"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { SupabaseWorkspaceRepository } from "@/data/supabase-repository";
import { getSupabaseClient } from "@/data/supabase-client";
import { LocalWorkspaceRepository } from "@/data/local-repository";
import { createSeedWorkspace } from "@/data/seed";
import { nextDate, todayKey } from "@/domain/date";
import { expireTasks } from "@/domain/selectors";
import { createId } from "@/domain/id";
import type {
  DailyReview,
  DailyReviewInput,
  FocusProject,
  FocusProjectInput,
  FocusSession,
  LearningEntry,
  LearningEntryInput,
  Profile,
  SaveStatus,
  TaskInput,
  WorkEntry,
  WorkEntryInput,
  Workspace,
  WorkspaceTask,
} from "@/domain/types";
import { useAuth } from "./auth-provider";
import { persistFocusSession } from "./focus-session-action";

interface WorkspaceContextValue {
  workspace: Workspace;
  saveStatus: SaveStatus;
  error: string | null;
  syncMode: "local" | "cloud";
  migrationPending: boolean;
  replaceWorkspace: (next: Workspace) => Promise<void>;
  migrateLocalData: () => Promise<void>;
  startFreshCloudWorkspace: () => Promise<void>;
  createFocusProject: (input: FocusProjectInput) => Promise<void>;
  updateFocusProject: (id: string, patch: FocusProjectInput) => Promise<void>;
  deleteFocusProject: (id: string) => Promise<void>;
  createTask: (input: TaskInput) => Promise<void>;
  updateTask: (id: string, patch: Partial<TaskInput>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  rollTaskToTomorrow: (id: string) => Promise<void>;
  createWorkEntry: (input: WorkEntryInput) => Promise<void>;
  updateWorkEntry: (id: string, patch: WorkEntryInput) => Promise<void>;
  deleteWorkEntry: (id: string) => Promise<void>;
  createLearningEntry: (input: LearningEntryInput) => Promise<void>;
  updateLearningEntry: (id: string, patch: LearningEntryInput) => Promise<void>;
  deleteLearningEntry: (id: string) => Promise<void>;
  upsertReview: (input: DailyReviewInput) => Promise<void>;
  createFocusSession: (input: Omit<FocusSession, "createdAt">) => Promise<void>;
  updateProfile: (patch: Pick<Profile, "displayName" | "timezone">) => Promise<void>;
  resetWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function hasLocalData(workspace: Workspace) {
  return workspace.focusProjects.length > 0 || workspace.tasks.length > 0 || workspace.workEntries.length > 0 || workspace.learningEntries.length > 0 || workspace.dailyReviews.length > 0 || workspace.focusSessions.length > 0;
}

function MigrationDialog({ onUpload, onStartFresh }: { onUpload: () => void; onStartFresh: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-panel migration-panel" role="dialog" aria-modal="true" aria-labelledby="migration-title">
        <div>
          <h2 id="migration-title">发现本地数据</h2>
          <p>云端账号还是空的。要把这台设备上的重点项目、任务、记录和复盘上传到云端吗？上传后，其他设备登录同一邮箱即可看到这些内容。</p>
        </div>
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onStartFresh}>从云端重新开始</button>
          <button className="button primary" type="button" onClick={onUpload}>上传本地数据</button>
        </div>
      </section>
    </div>
  );
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { configured, session, status: authStatus } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const workspaceRef = useRef<Workspace | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [repository, setRepository] = useState<LocalWorkspaceRepository | SupabaseWorkspaceRepository | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<"local" | "cloud">("local");
  const [migrationPending, setMigrationPending] = useState(false);
  const localRepository = useMemo(
    () => (typeof window === "undefined" ? null : new LocalWorkspaceRepository(window.localStorage)),
    [],
  );

  const replaceWorkspace = useCallback(async (next: Workspace) => {
    if (!repository || !localRepository) return;
    setSaveStatus("saving");
    setError(null);
    workspaceRef.current = next;
    setWorkspace(next);
    try {
      await localRepository.save(next);
      if (syncMode === "cloud") await repository.save(next);
      setSaveStatus("saved");
    } catch (reason) {
      setSaveStatus("error");
      setError(reason instanceof Error ? reason.message : "保存失败，请检查网络后重试。");
      throw reason;
    }
  }, [localRepository, repository, syncMode]);

  useEffect(() => {
    if (!workspace || !repository) return;
    const tasks = expireTasks(workspace.tasks, todayKey(workspace.profile.timezone));
    if (tasks.every((task, index) => task === workspace.tasks[index])) return;
    void replaceWorkspace({ ...workspace, tasks });
  }, [repository, replaceWorkspace, workspace]);

  useEffect(() => {
    if (!localRepository) return;
    localRepository
      .load()
      .then((loaded) => {
        workspaceRef.current = loaded;
        setWorkspace(loaded);
        setRepository(localRepository);
        setLocalReady(true);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "本地数据加载失败。"));
  }, [localRepository]);

  useEffect(() => {
    if (!localReady || !localRepository || !configured) return;
    if (authStatus !== "signed_in" || !session) {
      setSyncMode("local");
      setMigrationPending(false);
      localRepository.load().then((loaded) => {
        workspaceRef.current = loaded;
        setWorkspace(loaded);
        setRepository(localRepository);
      }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "本地数据加载失败。"));
      return;
    }

    const cloudRepository = new SupabaseWorkspaceRepository(getSupabaseClient(), session.user.id);
    setSaveStatus("saving");
    cloudRepository.load().then(async (remoteWorkspace) => {
      setRepository(cloudRepository);
      setSyncMode("cloud");
      const localWorkspace = workspaceRef.current;
      const remoteIsEmpty = !hasLocalData(remoteWorkspace);
      if (remoteIsEmpty && localWorkspace && hasLocalData(localWorkspace)) {
        setMigrationPending(true);
        setSaveStatus("idle");
        return;
      }
      workspaceRef.current = remoteWorkspace;
      setWorkspace(remoteWorkspace);
      await localRepository.save(remoteWorkspace);
      setSaveStatus("saved");
      setError(null);
    }).catch((reason: unknown) => {
      setSaveStatus("error");
      setError(reason instanceof Error ? reason.message : "云端数据加载失败，请检查网络后重试。");
    });
  }, [authStatus, configured, localReady, localRepository, session]);

  async function migrateLocalData() {
    if (!repository || !workspaceRef.current) return;
    setSaveStatus("saving");
    setError(null);
    try {
      await repository.save(workspaceRef.current);
      setMigrationPending(false);
      setSaveStatus("saved");
    } catch (reason) {
      setSaveStatus("error");
      setError(reason instanceof Error ? reason.message : "上传失败，请检查网络后重试。");
    }
  }

  async function startFreshCloudWorkspace() {
    if (!repository || !localRepository) return;
    const next = createSeedWorkspace();
    setSaveStatus("saving");
    setError(null);
    try {
      await repository.clear();
      await repository.save(next);
      await localRepository.save(next);
      workspaceRef.current = next;
      setWorkspace(next);
      setMigrationPending(false);
      setSaveStatus("saved");
    } catch (reason) {
      setSaveStatus("error");
      setError(reason instanceof Error ? reason.message : "初始化云端工作区失败，请重试。");
    }
  }

  async function createFocusProject(input: FocusProjectInput) {
    if (!workspace) return;
    const now = new Date().toISOString();
    const project: FocusProject = { id: createId(), createdAt: now, updatedAt: now, ...input };
    await replaceWorkspace({ ...workspace, focusProjects: [project, ...workspace.focusProjects] });
  }

  async function updateFocusProject(id: string, patch: FocusProjectInput) {
    if (!workspace) return;
    const updatedAt = new Date().toISOString();
    await replaceWorkspace({
      ...workspace,
      focusProjects: workspace.focusProjects.map((project) => project.id === id ? { ...project, ...patch, updatedAt } : project),
    });
  }

  async function deleteFocusProject(id: string) {
    if (!workspace) return;
    await replaceWorkspace({
      ...workspace,
      focusProjects: workspace.focusProjects.filter((project) => project.id !== id),
    });
  }

  async function createTask(input: TaskInput) {
    if (!workspace) return;
    const now = new Date().toISOString();
    const task: WorkspaceTask = {
      id: createId(),
      source: "manual",
      placement: "scheduled",
      backlogKind: null,
      originalTaskDate: null,
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    await replaceWorkspace({ ...workspace, tasks: [task, ...workspace.tasks] });
  }

  async function updateTask(id: string, patch: Partial<TaskInput>) {
    if (!workspace) return;
    const updatedAt = new Date().toISOString();
    await replaceWorkspace({ ...workspace, tasks: workspace.tasks.map((task) => task.id === id ? { ...task, ...patch, updatedAt } : task) });
  }

  async function deleteTask(id: string) {
    if (!workspace) return;
    const updatedAt = new Date().toISOString();
    await replaceWorkspace({
      ...workspace,
      tasks: workspace.tasks.filter((task) => task.id !== id),
      workEntries: workspace.workEntries.map((entry) => entry.taskId === id ? { ...entry, taskId: null, updatedAt } : entry),
      focusSessions: workspace.focusSessions.map((session) => session.taskId === id ? { ...session, taskId: null } : session),
    });
  }

  async function rollTaskToTomorrow(id: string) {
    if (!workspace) return;
    const task = workspace.tasks.find((item) => item.id === id);
    if (!task) return;
    await updateTask(id, {
      taskDate: nextDate(task.taskDate),
      placement: "scheduled",
      backlogKind: null,
      originalTaskDate: null,
      status: "todo",
    });
  }

  async function createWorkEntry(input: WorkEntryInput) {
    if (!workspace) return;
    const now = new Date().toISOString();
    const entry: WorkEntry = { id: createId(), createdAt: now, updatedAt: now, ...input };
    await replaceWorkspace({ ...workspace, workEntries: [entry, ...workspace.workEntries] });
  }

  async function updateWorkEntry(id: string, patch: WorkEntryInput) {
    if (!workspace) return;
    const updatedAt = new Date().toISOString();
    await replaceWorkspace({ ...workspace, workEntries: workspace.workEntries.map((entry) => entry.id === id ? { ...entry, ...patch, updatedAt } : entry) });
  }

  async function deleteWorkEntry(id: string) {
    if (!workspace) return;
    await replaceWorkspace({ ...workspace, workEntries: workspace.workEntries.filter((entry) => entry.id !== id) });
  }

  async function createLearningEntry(input: LearningEntryInput) {
    if (!workspace) return;
    const now = new Date().toISOString();
    const entry: LearningEntry = { id: createId(), createdAt: now, updatedAt: now, ...input };
    await replaceWorkspace({ ...workspace, learningEntries: [entry, ...workspace.learningEntries] });
  }

  async function updateLearningEntry(id: string, patch: LearningEntryInput) {
    if (!workspace) return;
    const updatedAt = new Date().toISOString();
    await replaceWorkspace({ ...workspace, learningEntries: workspace.learningEntries.map((entry) => entry.id === id ? { ...entry, ...patch, updatedAt } : entry) });
  }

  async function deleteLearningEntry(id: string) {
    if (!workspace) return;
    await replaceWorkspace({ ...workspace, learningEntries: workspace.learningEntries.filter((entry) => entry.id !== id) });
  }

  async function upsertReview(input: DailyReviewInput) {
    if (!workspace) return;
    const now = new Date().toISOString();
    const existing = workspace.dailyReviews.find((review) => review.reviewDate === input.reviewDate);
    const review: DailyReview = existing ? { ...existing, ...input, updatedAt: now } : { id: createId(), createdAt: now, updatedAt: now, ...input };
    await replaceWorkspace({ ...workspace, dailyReviews: [review, ...workspace.dailyReviews.filter((item) => item.reviewDate !== input.reviewDate)] });
  }

  async function createFocusSession(input: Omit<FocusSession, "createdAt">) {
    if (!workspace) return;
    await persistFocusSession(workspace, input, replaceWorkspace);
  }

  async function updateProfile(patch: Pick<Profile, "displayName" | "timezone">) {
    if (!workspace) return;
    await replaceWorkspace({ ...workspace, profile: { ...workspace.profile, ...patch, updatedAt: new Date().toISOString() } });
  }

  async function resetWorkspace() {
    if (!repository || !localRepository) return;
    setSaveStatus("saving");
    setError(null);
    try {
      if (syncMode === "cloud") await repository.clear();
      else await localRepository.clear();
      const next = createSeedWorkspace();
      await replaceWorkspace(next);
    } catch (reason) {
      setSaveStatus("error");
      setError(reason instanceof Error ? reason.message : "重置失败，请重试。");
    }
  }

  if (error && !workspace) {
    return (
      <main className="loading-screen">
        <div className="loading-panel" role="alert">
          <strong>无法打开工作台</strong>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!workspace || !repository) {
    return (
      <main className="loading-screen" aria-label="正在加载">
        <span className="spinner" aria-hidden="true" />
        <p>正在整理今天的工作台…</p>
      </main>
    );
  }

  return (
    <WorkspaceContext.Provider value={{ workspace, saveStatus, error, syncMode, migrationPending, replaceWorkspace, migrateLocalData, startFreshCloudWorkspace, createFocusProject, updateFocusProject, deleteFocusProject, createTask, updateTask, deleteTask, rollTaskToTomorrow, createWorkEntry, updateWorkEntry, deleteWorkEntry, createLearningEntry, updateLearningEntry, deleteLearningEntry, upsertReview, createFocusSession, updateProfile, resetWorkspace }}>
      {children}
      {migrationPending ? <MigrationDialog onUpload={() => void migrateLocalData()} onStartFresh={() => void startFreshCloudWorkspace()} /> : null}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace 必须在 WorkspaceProvider 内使用");
  return context;
}
