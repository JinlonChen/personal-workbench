export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "doing" | "done" | "cancelled";
export type TaskPlacement = "scheduled" | "backlog";
export type TaskBacklogKind = "unscheduled" | "unexecuted" | null;
export type RecurrenceUnit = "day" | "week" | "month" | "quarter" | "year";
export type RecurrenceMode = "fixed" | "after_completion";
export type MissedOccurrencePolicy = "catch_up_all" | "latest_only";
export type RecurringPlanStatus = "active" | "paused" | "terminated";
export type RecurringCategory = "work" | "life";
export type RecurringOccurrenceStatus = "generated" | "completed" | "cancelled" | "skipped" | "deleted";
export type FocusProjectStatus = "on_track" | "attention" | "blocked";
export type FocusProjectTier = "top" | "parallel" | "paused";
export type Mood = "low" | "neutral" | "steady" | "good" | "great";
export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type PomodoroMinutes = 15 | 25 | 45 | 60;

export interface Profile {
  id: string;
  displayName: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  description: string;
  taskDate: string;
  placement: TaskPlacement;
  backlogKind: TaskBacklogKind;
  originalTaskDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  source: "manual" | "work_entry" | "recurring_plan";
  recurringPlanId: string | null;
  recurrenceDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FocusProject {
  id: string;
  name: string;
  platformUrl: string;
  owner: string;
  tier: FocusProjectTier;
  status: FocusProjectStatus;
  currentGoal: string;
  risk: string;
  nextAction: string;
  latestConclusion: string;
  nextReviewDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkEntry {
  id: string;
  entryDate: string;
  title: string;
  content: string;
  result: string;
  taskId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LearningEntry {
  id: string;
  entryDate: string;
  title: string;
  content: string;
  sourceUrl: string;
  keyPoints: string;
  nextAction: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyReview {
  id: string;
  reviewDate: string;
  completedSummary: string;
  mainGain: string;
  blockers: string;
  improvement: string;
  tomorrowFocus: string;
  mood: Mood;
  energy: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  taskId: string | null;
  taskTitle: string;
  focusDate: string;
  plannedMinutes: PomodoroMinutes;
  completedAt: string;
  createdAt: string;
}

export interface RecurringPlan {
  id: string;
  title: string;
  description: string;
  category: RecurringCategory;
  startDate: string;
  interval: number;
  unit: RecurrenceUnit;
  mode: RecurrenceMode;
  missedPolicy: MissedOccurrencePolicy | null;
  priority: TaskPriority;
  inAppReminder: boolean;
  browserNotification: boolean;
  endDate: string | null;
  status: RecurringPlanStatus;
  completionAnchorDate: string | null;
  nextDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringOccurrence {
  id: string;
  recurringPlanId: string;
  dueDate: string;
  taskId: string | null;
  status: RecurringOccurrenceStatus;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  schemaVersion: 3;
  profile: Profile;
  focusProjects: FocusProject[];
  tasks: WorkspaceTask[];
  workEntries: WorkEntry[];
  learningEntries: LearningEntry[];
  dailyReviews: DailyReview[];
  focusSessions: FocusSession[];
  recurringPlans: RecurringPlan[];
  recurringOccurrences: RecurringOccurrence[];
}

export type TaskInput = Pick<WorkspaceTask, "title" | "description" | "taskDate" | "priority" | "status">
  & Partial<Pick<WorkspaceTask, "placement" | "backlogKind" | "originalTaskDate">>;
export type RecurringPlanInput = Omit<RecurringPlan, "id" | "status" | "completionAnchorDate" | "nextDueDate" | "createdAt" | "updatedAt">;
export type FocusProjectInput = Omit<FocusProject, "id" | "createdAt" | "updatedAt">;
export type WorkEntryInput = Pick<WorkEntry, "entryDate" | "title" | "content" | "result" | "taskId" | "tags">;
export type LearningEntryInput = Pick<
  LearningEntry,
  "entryDate" | "title" | "content" | "sourceUrl" | "keyPoints" | "nextAction" | "tags"
>;
export type DailyReviewInput = Omit<DailyReview, "id" | "createdAt" | "updatedAt">;

export interface RecordFilters {
  keyword?: string;
  date?: string;
  tag?: string;
}
