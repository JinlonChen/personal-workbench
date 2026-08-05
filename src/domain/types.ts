export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "doing" | "done" | "cancelled";
export type FocusProjectStatus = "on_track" | "attention" | "blocked";
export type FocusProjectTier = "top" | "parallel" | "paused";
export type Mood = "low" | "neutral" | "steady" | "good" | "great";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

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
  priority: TaskPriority;
  status: TaskStatus;
  source: "manual" | "work_entry";
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

export interface Workspace {
  schemaVersion: 1;
  profile: Profile;
  focusProjects: FocusProject[];
  tasks: WorkspaceTask[];
  workEntries: WorkEntry[];
  learningEntries: LearningEntry[];
  dailyReviews: DailyReview[];
}

export type TaskInput = Pick<WorkspaceTask, "title" | "description" | "taskDate" | "priority" | "status">;
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
