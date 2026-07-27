"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { LocalWorkspaceRepository } from "@/data/local-repository";
import { createSeedWorkspace } from "@/data/seed";
import { nextDate } from "@/domain/date";
import { createId } from "@/domain/id";
import type { DailyReview, DailyReviewInput, LearningEntry, LearningEntryInput, Profile, SaveStatus, TaskInput, WorkEntry, WorkEntryInput, Workspace, WorkspaceTask } from "@/domain/types";

interface WorkspaceContextValue {
  workspace: Workspace;
  saveStatus: SaveStatus;
  error: string | null;
  replaceWorkspace: (next: Workspace) => Promise<void>;
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
  updateProfile: (patch: Pick<Profile, "displayName" | "timezone">) => Promise<void>;
  resetWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const repository = useMemo(
    () => (typeof window === "undefined" ? null : new LocalWorkspaceRepository(window.localStorage)),
    [],
  );

  useEffect(() => {
    if (!repository) return;
    repository
      .load()
      .then(setWorkspace)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "本地数据加载失败。"));
  }, [repository]);

  async function replaceWorkspace(next: Workspace) {
    if (!repository) return;
    setSaveStatus("saving");
    setError(null);
    try {
      await repository.save(next);
      setWorkspace(next);
      setSaveStatus("saved");
    } catch (reason) {
      setSaveStatus("error");
      setError(reason instanceof Error ? reason.message : "保存失败，请重试。");
      throw reason;
    }
  }

  async function createTask(input: TaskInput) {
    if (!workspace) return;
    const now = new Date().toISOString();
    const task: WorkspaceTask = { id: createId(), source: "manual", createdAt: now, updatedAt: now, ...input };
    await replaceWorkspace({ ...workspace, tasks: [task, ...workspace.tasks] });
  }

  async function updateTask(id: string, patch: Partial<TaskInput>) {
    if (!workspace) return;
    const updatedAt = new Date().toISOString();
    await replaceWorkspace({ ...workspace, tasks: workspace.tasks.map((task) => task.id === id ? { ...task, ...patch, updatedAt } : task) });
  }

  async function deleteTask(id: string) {
    if (!workspace) return;
    await replaceWorkspace({ ...workspace, tasks: workspace.tasks.filter((task) => task.id !== id) });
  }

  async function rollTaskToTomorrow(id: string) {
    if (!workspace) return;
    const task = workspace.tasks.find((item) => item.id === id);
    if (!task) return;
    await updateTask(id, { taskDate: nextDate(task.taskDate), status: "todo" });
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

  async function updateProfile(patch: Pick<Profile, "displayName" | "timezone">) {
    if (!workspace) return;
    await replaceWorkspace({ ...workspace, profile: { ...workspace.profile, ...patch, updatedAt: new Date().toISOString() } });
  }

  async function resetWorkspace() {
    if (!repository) return;
    setSaveStatus("saving");
    await repository.clear();
    const next = createSeedWorkspace();
    await repository.save(next);
    setWorkspace(next);
    setSaveStatus("saved");
    setError(null);
  }

  if (error && !workspace) {
    return (
      <main className="loading-screen">
        <div className="loading-panel" role="alert">
          <strong>无法打开本地工作台</strong>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!workspace) {
    return (
      <main className="loading-screen" aria-label="正在加载">
        <span className="spinner" aria-hidden="true" />
        <p>正在整理今天的工作台…</p>
      </main>
    );
  }

  return (
    <WorkspaceContext.Provider value={{ workspace, saveStatus, error, replaceWorkspace, createTask, updateTask, deleteTask, rollTaskToTomorrow, createWorkEntry, updateWorkEntry, deleteWorkEntry, createLearningEntry, updateLearningEntry, deleteLearningEntry, upsertReview, updateProfile, resetWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace 必须在 WorkspaceProvider 内使用");
  return context;
}
