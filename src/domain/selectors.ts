import { nextDate } from "./date";
import type { DailyReview, FocusSession, LearningEntry, RecordFilters, WorkEntry, WorkspaceTask } from "./types";

export function tasksForDate(tasks: WorkspaceTask[], date: string): WorkspaceTask[] {
  return tasks
    .filter((task) => task.placement === "scheduled" && task.taskDate === date)
    .sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.priority] - priority[b.priority] || b.createdAt.localeCompare(a.createdAt);
    });
}

export function backlogTasks(tasks: WorkspaceTask[]): WorkspaceTask[] {
  return tasks
    .filter((task) => task.placement === "backlog" && task.status !== "done" && task.status !== "cancelled")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function expireTasks(tasks: WorkspaceTask[], today: string, timestamp = new Date().toISOString()): WorkspaceTask[] {
  return tasks.map((task) => {
    if (task.placement !== "scheduled" || task.taskDate >= today || (task.status !== "todo" && task.status !== "doing")) return task;
    return {
      ...task,
      placement: "backlog",
      backlogKind: "unexecuted",
      originalTaskDate: task.originalTaskDate ?? task.taskDate,
      updatedAt: timestamp,
    };
  });
}

export function completionRate(tasks: WorkspaceTask[], date: string): number {
  const active = tasksForDate(tasks, date).filter((task) => task.status !== "cancelled");
  if (!active.length) return 0;
  return Math.round((active.filter((task) => task.status === "done").length / active.length) * 100);
}

export function focusSummaryForDate(sessions: FocusSession[], date: string) {
  const matches = sessions.filter((session) => session.focusDate === date);
  return {
    count: matches.length,
    minutes: matches.reduce((sum, session) => sum + session.plannedMinutes, 0),
  };
}

export function focusMinutesForTask(sessions: FocusSession[], taskId: string): number {
  return sessions
    .filter((session) => session.taskId === taskId)
    .reduce((sum, session) => sum + session.plannedMinutes, 0);
}

export function rollTask(task: WorkspaceTask, date: string, timestamp = new Date().toISOString()): WorkspaceTask {
  return { ...task, taskDate: date, status: "todo", updatedAt: timestamp };
}

function matchesFilters(
  entry: Pick<WorkEntry, "entryDate" | "title" | "content" | "tags">,
  filters: RecordFilters,
  extraText = "",
): boolean {
  const keyword = filters.keyword?.trim().toLocaleLowerCase();
  const text = `${entry.title} ${entry.content} ${entry.tags.join(" ")} ${extraText}`.toLocaleLowerCase();
  return (
    (!filters.date || entry.entryDate === filters.date) &&
    (!filters.tag || entry.tags.includes(filters.tag)) &&
    (!keyword || text.includes(keyword))
  );
}

export function filterWorkEntries(entries: WorkEntry[], filters: RecordFilters): WorkEntry[] {
  return entries.filter((entry) => matchesFilters(entry, filters, entry.result));
}

export function filterLearningEntries(entries: LearningEntry[], filters: RecordFilters): LearningEntry[] {
  return entries.filter((entry) => matchesFilters(entry, filters, `${entry.keyPoints} ${entry.nextAction}`));
}

export function reviewStreak(reviews: DailyReview[], referenceDate: string): number {
  const dates = new Set(reviews.map((review) => review.reviewDate));
  let cursor = referenceDate;
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    const previous = new Date(`${cursor}T12:00:00.000Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    cursor = previous.toISOString().slice(0, 10);
  }
  return streak;
}

export function tomorrowForTask(task: WorkspaceTask): string {
  return nextDate(task.taskDate);
}
