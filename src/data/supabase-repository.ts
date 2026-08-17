import type { SupabaseClient } from "@supabase/supabase-js";

import type { WorkspaceRepository } from "./repository";
import type { DailyReview, FocusProject, FocusSession, Profile, RecurringOccurrence, RecurringPlan, Workspace, WorkspaceTask } from "@/domain/types";

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
  placement: WorkspaceTask["placement"] | null;
  backlog_kind: Exclude<WorkspaceTask["backlogKind"], null> | null;
  original_task_date: string | null;
  priority: WorkspaceTask["priority"];
  status: WorkspaceTask["status"];
  source: WorkspaceTask["source"];
  recurring_plan_id: string | null;
  recurrence_due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type FocusProjectRow = {
  id: string;
  user_id: string;
  name: string;
  platform_url: string;
  owner: string;
  tier: FocusProject["tier"];
  status: FocusProject["status"];
  current_goal: string;
  risk: string;
  next_action: string;
  latest_conclusion: string;
  next_review_date: string;
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

export type FocusSessionRow = {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title: string;
  focus_date: string;
  planned_minutes: FocusSession["plannedMinutes"];
  completed_at: string;
  created_at: string;
};

export type RecurringPlanRow = {
  id: string; user_id: string; title: string; description: string; category: RecurringPlan["category"];
  start_date: string; interval: number; unit: RecurringPlan["unit"]; mode: RecurringPlan["mode"];
  missed_policy: RecurringPlan["missedPolicy"]; priority: RecurringPlan["priority"];
  in_app_reminder: boolean; browser_notification: boolean; end_date: string | null;
  status: RecurringPlan["status"]; completion_anchor_date: string | null; next_due_date: string | null;
  created_at: string; updated_at: string;
};
export type RecurringOccurrenceRow = {
  id: string; user_id: string; recurring_plan_id: string; due_date: string; task_id: string | null;
  status: RecurringOccurrence["status"]; resolved_at: string | null; created_at: string; updated_at: string;
};

export type SupabaseRows = {
  profile: ProfileRow;
  focusProjects: FocusProjectRow[];
  tasks: TaskRow[];
  workEntries: WorkEntryRow[];
  learningEntries: LearningEntryRow[];
  dailyReviews: DailyReviewRow[];
  focusSessions: FocusSessionRow[];
  recurringPlans: RecurringPlanRow[];
  recurringOccurrences: RecurringOccurrenceRow[];
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
    focusProjects: workspace.focusProjects.map((project) => ({
      id: project.id,
      user_id: userId,
      name: project.name,
      platform_url: project.platformUrl,
      owner: project.owner,
      tier: project.tier,
      status: project.status,
      current_goal: project.currentGoal,
      risk: project.risk,
      next_action: project.nextAction,
      latest_conclusion: project.latestConclusion,
      next_review_date: project.nextReviewDate,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
    })),
    tasks: workspace.tasks.map((task) => ({
      id: task.id,
      user_id: userId,
      title: task.title,
      description: task.description,
      task_date: task.taskDate,
      placement: task.placement,
      backlog_kind: task.backlogKind,
      original_task_date: task.originalTaskDate,
      priority: task.priority,
      status: task.status,
      source: task.source,
      recurring_plan_id: task.recurringPlanId,
      recurrence_due_date: task.recurrenceDueDate,
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
    focusSessions: workspace.focusSessions.map((session) => ({
      id: session.id,
      user_id: userId,
      task_id: session.taskId,
      task_title: session.taskTitle,
      focus_date: session.focusDate,
      planned_minutes: session.plannedMinutes,
      completed_at: session.completedAt,
      created_at: session.createdAt,
    })),
    recurringPlans: workspace.recurringPlans.map((plan) => ({
      id: plan.id, user_id: userId, title: plan.title, description: plan.description, category: plan.category,
      start_date: plan.startDate, interval: plan.interval, unit: plan.unit, mode: plan.mode, missed_policy: plan.missedPolicy,
      priority: plan.priority, in_app_reminder: plan.inAppReminder, browser_notification: plan.browserNotification,
      end_date: plan.endDate, status: plan.status, completion_anchor_date: plan.completionAnchorDate,
      next_due_date: plan.nextDueDate, created_at: plan.createdAt, updated_at: plan.updatedAt,
    })),
    recurringOccurrences: workspace.recurringOccurrences.map((occurrence) => ({
      id: occurrence.id, user_id: userId, recurring_plan_id: occurrence.recurringPlanId, due_date: occurrence.dueDate,
      task_id: occurrence.taskId, status: occurrence.status, resolved_at: occurrence.resolvedAt,
      created_at: occurrence.createdAt, updated_at: occurrence.updatedAt,
    })),
  };
}

export function rowsToWorkspace(rows: SupabaseRows): Workspace {
  return {
    schemaVersion: 3,
    profile: {
      id: rows.profile.id,
      displayName: rows.profile.display_name,
      timezone: rows.profile.timezone,
      createdAt: rows.profile.created_at,
      updatedAt: rows.profile.updated_at,
    },
    focusProjects: rows.focusProjects.map((project) => ({
      id: project.id,
      name: project.name,
      platformUrl: project.platform_url,
      owner: project.owner,
      tier: project.tier,
      status: project.status,
      currentGoal: project.current_goal,
      risk: project.risk,
      nextAction: project.next_action,
      latestConclusion: project.latest_conclusion,
      nextReviewDate: project.next_review_date,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    })),
    tasks: rows.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      taskDate: task.task_date,
      placement: task.placement === "backlog" ? "backlog" : "scheduled",
      backlogKind: task.backlog_kind === "unscheduled" || task.backlog_kind === "unexecuted" ? task.backlog_kind : null,
      originalTaskDate: task.original_task_date ?? null,
      priority: task.priority,
      status: task.status,
      source: task.source,
      recurringPlanId: task.recurring_plan_id ?? null,
      recurrenceDueDate: task.recurrence_due_date ?? null,
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
    focusSessions: rows.focusSessions.map((session) => ({
      id: session.id,
      taskId: session.task_id,
      taskTitle: session.task_title,
      focusDate: session.focus_date,
      plannedMinutes: session.planned_minutes,
      completedAt: session.completed_at,
      createdAt: session.created_at,
    })),
    recurringPlans: rows.recurringPlans.map((plan) => ({
      id: plan.id, title: plan.title, description: plan.description, category: plan.category,
      startDate: plan.start_date, interval: plan.interval, unit: plan.unit, mode: plan.mode, missedPolicy: plan.missed_policy,
      priority: plan.priority, inAppReminder: plan.in_app_reminder, browserNotification: plan.browser_notification,
      endDate: plan.end_date, status: plan.status, completionAnchorDate: plan.completion_anchor_date,
      nextDueDate: plan.next_due_date, createdAt: plan.created_at, updatedAt: plan.updated_at,
    })),
    recurringOccurrences: rows.recurringOccurrences.map((occurrence) => ({
      id: occurrence.id, recurringPlanId: occurrence.recurring_plan_id, dueDate: occurrence.due_date,
      taskId: occurrence.task_id, status: occurrence.status, resolvedAt: occurrence.resolved_at,
      createdAt: occurrence.created_at, updatedAt: occurrence.updated_at,
    })),
  };
}

type TableName = "focus_projects" | "tasks" | "work_entries" | "learning_entries" | "daily_reviews" | "focus_sessions" | "recurring_plans" | "recurring_occurrences";

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
    const [profileResult, focusProjectsResult, tasksResult, workEntriesResult, learningEntriesResult, reviewsResult, focusSessionsResult, recurringPlansResult, recurringOccurrencesResult] = await Promise.all([
      this.client.from("profiles").select("id, display_name, timezone, created_at, updated_at").eq("id", this.userId).maybeSingle(),
      this.client.from("focus_projects").select("id, user_id, name, platform_url, owner, tier, status, current_goal, risk, next_action, latest_conclusion, next_review_date, created_at, updated_at").eq("user_id", this.userId).order("next_review_date", { ascending: true }),
      this.client.from("tasks").select("id, user_id, title, description, task_date, placement, backlog_kind, original_task_date, priority, status, source, recurring_plan_id, recurrence_due_date, created_at, updated_at").eq("user_id", this.userId).order("task_date", { ascending: false }),
      this.client.from("work_entries").select("id, user_id, entry_date, title, content, result, task_id, tags, created_at, updated_at").eq("user_id", this.userId).order("entry_date", { ascending: false }),
      this.client.from("learning_entries").select("id, user_id, entry_date, title, content, source_url, key_points, next_action, tags, created_at, updated_at").eq("user_id", this.userId).order("entry_date", { ascending: false }),
      this.client.from("daily_reviews").select("id, user_id, review_date, completed_summary, main_gain, blockers, improvement, tomorrow_focus, mood, energy, notes, created_at, updated_at").eq("user_id", this.userId).order("review_date", { ascending: false }),
      this.client.from("focus_sessions").select("id, user_id, task_id, task_title, focus_date, planned_minutes, completed_at, created_at").eq("user_id", this.userId).order("completed_at", { ascending: false }),
      this.client.from("recurring_plans").select("id, user_id, title, description, category, start_date, interval, unit, mode, missed_policy, priority, in_app_reminder, browser_notification, end_date, status, completion_anchor_date, next_due_date, created_at, updated_at").eq("user_id", this.userId).order("next_due_date", { ascending: true }),
      this.client.from("recurring_occurrences").select("id, user_id, recurring_plan_id, due_date, task_id, status, resolved_at, created_at, updated_at").eq("user_id", this.userId).order("due_date", { ascending: false }),
    ]);

    const failedResult = [profileResult, focusProjectsResult, tasksResult, workEntriesResult, learningEntriesResult, reviewsResult, focusSessionsResult, recurringPlansResult, recurringOccurrencesResult]
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
      focusProjects: (focusProjectsResult.data ?? []) as FocusProjectRow[],
      tasks: (tasksResult.data ?? []) as TaskRow[],
      workEntries: (workEntriesResult.data ?? []) as WorkEntryRow[],
      learningEntries: (learningEntriesResult.data ?? []) as LearningEntryRow[],
      dailyReviews: (reviewsResult.data ?? []) as DailyReviewRow[],
      focusSessions: (focusSessionsResult.data ?? []) as FocusSessionRow[],
      recurringPlans: (recurringPlansResult.data ?? []) as RecurringPlanRow[],
      recurringOccurrences: (recurringOccurrencesResult.data ?? []) as RecurringOccurrenceRow[],
    });
  }

  async save(workspace: Workspace): Promise<void> {
    const rows = workspaceToRows(workspace, this.userId);
    try {
      await this.assertSuccess(this.client.from("profiles").upsert(rows.profile, { onConflict: "id" }));
      await this.syncTable("focus_projects", rows.focusProjects);
      await this.syncTable("recurring_plans", rows.recurringPlans);
      await this.syncTable("tasks", rows.tasks);
      await this.syncTable("recurring_occurrences", rows.recurringOccurrences);
      await this.syncTable("work_entries", rows.workEntries);
      await this.syncTable("learning_entries", rows.learningEntries);
      await this.syncTable("daily_reviews", rows.dailyReviews);
      await this.syncTable("focus_sessions", rows.focusSessions);
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
      await this.deleteAll("focus_projects");
      await this.deleteAll("focus_sessions");
      await this.deleteAll("recurring_occurrences");
      await this.deleteAll("recurring_plans");
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
