import type { SupabaseClient } from "@supabase/supabase-js";

import type { WorkspaceRepository } from "./repository";
import type { DailyReview, Profile, Workspace, WorkspaceTask } from "@/domain/types";

export type ProfileRow = {
  id: string;
  display_name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  task_date: string;
  priority: WorkspaceTask["priority"];
  status: WorkspaceTask["status"];
  source: WorkspaceTask["source"];
  created_at: string;
  updated_at: string;
};

export type WorkEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  title: string;
  content: string;
  result: string;
  task_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type LearningEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  title: string;
  content: string;
  source_url: string;
  key_points: string;
  next_action: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type DailyReviewRow = {
  id: string;
  user_id: string;
  review_date: string;
  completed_summary: string;
  main_gain: string;
  blockers: string;
  improvement: string;
  tomorrow_focus: string;
  mood: DailyReview["mood"];
  energy: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type SupabaseRows = {
  profile: ProfileRow;
  tasks: TaskRow[];
  workEntries: WorkEntryRow[];
  learningEntries: LearningEntryRow[];
  dailyReviews: DailyReviewRow[];
};

function profileToRow(profile: Profile, userId: string): ProfileRow {
  return {
    id: userId,
    display_name: profile.displayName,
    timezone: profile.timezone,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

export function workspaceToRows(workspace: Workspace, userId: string): SupabaseRows {
  return {
    profile: profileToRow(workspace.profile, userId),
    tasks: workspace.tasks.map((task) => ({
      id: task.id,
      user_id: userId,
      title: task.title,
      description: task.description,
      task_date: task.taskDate,
      priority: task.priority,
      status: task.status,
      source: task.source,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    })),
    workEntries: workspace.workEntries.map((entry) => ({
      id: entry.id,
      user_id: userId,
      entry_date: entry.entryDate,
      title: entry.title,
      content: entry.content,
      result: entry.result,
      task_id: entry.taskId,
      tags: entry.tags,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    })),
    learningEntries: workspace.learningEntries.map((entry) => ({
      id: entry.id,
      user_id: userId,
      entry_date: entry.entryDate,
      title: entry.title,
      content: entry.content,
      source_url: entry.sourceUrl,
      key_points: entry.keyPoints,
      next_action: entry.nextAction,
      tags: entry.tags,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    })),
    dailyReviews: workspace.dailyReviews.map((review) => ({
      id: review.id,
      user_id: userId,
      review_date: review.reviewDate,
      completed_summary: review.completedSummary,
      main_gain: review.mainGain,
      blockers: review.blockers,
      improvement: review.improvement,
      tomorrow_focus: review.tomorrowFocus,
      mood: review.mood,
      energy: review.energy,
      notes: review.notes,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
    })),
  };
}

export function rowsToWorkspace(rows: SupabaseRows): Workspace {
  return {
    schemaVersion: 1,
    profile: {
      id: rows.profile.id,
      displayName: rows.profile.display_name,
      timezone: rows.profile.timezone,
      createdAt: rows.profile.created_at,
      updatedAt: rows.profile.updated_at,
    },
    tasks: rows.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      taskDate: task.task_date,
      priority: task.priority,
      status: task.status,
      source: task.source,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    })),
    workEntries: rows.workEntries.map((entry) => ({
      id: entry.id,
      entryDate: entry.entry_date,
      title: entry.title,
      content: entry.content,
      result: entry.result,
      taskId: entry.task_id,
      tags: entry.tags ?? [],
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    })),
    learningEntries: rows.learningEntries.map((entry) => ({
      id: entry.id,
      entryDate: entry.entry_date,
      title: entry.title,
      content: entry.content,
      sourceUrl: entry.source_url,
      keyPoints: entry.key_points,
      nextAction: entry.next_action,
      tags: entry.tags ?? [],
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    })),
    dailyReviews: rows.dailyReviews.map((review) => ({
      id: review.id,
      reviewDate: review.review_date,
      completedSummary: review.completed_summary,
      mainGain: review.main_gain,
      blockers: review.blockers,
      improvement: review.improvement,
      tomorrowFocus: review.tomorrow_focus,
      mood: review.mood,
      energy: review.energy,
      notes: review.notes,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    })),
  };
}

type TableName = "tasks" | "work_entries" | "learning_entries" | "daily_reviews";

class CloudLoadError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "CloudLoadError";
  }
}

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly client: SupabaseClient, private readonly userId: string) {}

  async load(): Promise<Workspace> {
    try {
      return await this.loadOnce();
    } catch (reason) {
      if (!(reason instanceof CloudLoadError) || reason.status !== 401) throw reason;
      const { error } = await this.client.auth.refreshSession();
      if (error) throw reason;
      return this.loadOnce();
    }
  }

  private async loadOnce(): Promise<Workspace> {
    const [profileResult, tasksResult, workEntriesResult, learningEntriesResult, reviewsResult] = await Promise.all([
      this.client.from("profiles").select("id, display_name, timezone, created_at, updated_at").eq("id", this.userId).maybeSingle(),
      this.client.from("tasks").select("id, user_id, title, description, task_date, priority, status, source, created_at, updated_at").eq("user_id", this.userId).order("task_date", { ascending: false }),
      this.client.from("work_entries").select("id, user_id, entry_date, title, content, result, task_id, tags, created_at, updated_at").eq("user_id", this.userId).order("entry_date", { ascending: false }),
      this.client.from("learning_entries").select("id, user_id, entry_date, title, content, source_url, key_points, next_action, tags, created_at, updated_at").eq("user_id", this.userId).order("entry_date", { ascending: false }),
      this.client.from("daily_reviews").select("id, user_id, review_date, completed_summary, main_gain, blockers, improvement, tomorrow_focus, mood, energy, notes, created_at, updated_at").eq("user_id", this.userId).order("review_date", { ascending: false }),
    ]);

    const failedResult = [profileResult, tasksResult, workEntriesResult, learningEntriesResult, reviewsResult]
      .find((result) => result.error);
    if (failedResult?.error) {
      throw new CloudLoadError(
        `云端数据读取失败：${failedResult.error.message || "未知错误"}`,
        failedResult.status,
      );
    }

    const now = new Date().toISOString();
    const profile = profileResult.data ?? {
      id: this.userId,
      display_name: "朋友",
      timezone: "Asia/Shanghai",
      created_at: now,
      updated_at: now,
    };
    return rowsToWorkspace({
      profile,
      tasks: (tasksResult.data ?? []) as TaskRow[],
      workEntries: (workEntriesResult.data ?? []) as WorkEntryRow[],
      learningEntries: (learningEntriesResult.data ?? []) as LearningEntryRow[],
      dailyReviews: (reviewsResult.data ?? []) as DailyReviewRow[],
    });
  }

  async save(workspace: Workspace): Promise<void> {
    const rows = workspaceToRows(workspace, this.userId);
    try {
      await this.assertSuccess(this.client.from("profiles").upsert(rows.profile, { onConflict: "id" }));
      await this.syncTable("tasks", rows.tasks);
      await this.syncTable("work_entries", rows.workEntries);
      await this.syncTable("learning_entries", rows.learningEntries);
      await this.syncTable("daily_reviews", rows.dailyReviews);
    } catch (reason) {
      if (reason instanceof Error && reason.message.startsWith("云端同步失败")) throw reason;
      throw new Error(`云端同步失败：${reason instanceof Error ? reason.message : "未知错误"}`);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.deleteAll("daily_reviews");
      await this.deleteAll("work_entries");
      await this.deleteAll("learning_entries");
      await this.deleteAll("tasks");
    } catch (reason) {
      throw new Error(`云端清空失败：${reason instanceof Error ? reason.message : "未知错误"}`);
    }
  }

  private async syncTable(table: TableName, rows: Array<Record<string, unknown>>) {
    const existing = await this.assertSuccess(this.client.from(table).select("id").eq("user_id", this.userId));
    const nextIds = new Set(rows.map((row) => String(row.id)));
    const removedIds = ((existing ?? []) as Array<{ id: string }>).map((row) => row.id).filter((id) => !nextIds.has(id));
    if (removedIds.length > 0) {
      await this.assertSuccess(this.client.from(table).delete().eq("user_id", this.userId).in("id", removedIds));
    }
    if (rows.length > 0) {
      await this.assertSuccess(this.client.from(table).upsert(rows, { onConflict: "id" }));
    }
  }

  private async deleteAll(table: TableName) {
    await this.assertSuccess(this.client.from(table).delete().eq("user_id", this.userId));
  }

  private async assertSuccess<T>(request: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
    const result = await request;
    if (result.error) throw new Error(result.error.message);
    return result.data;
  }
}
