import type {
  FocusProjectStatus,
  FocusProjectTier,
  MissedOccurrencePolicy,
  RecurrenceMode,
  RecurrenceUnit,
  RecurringCategory,
  TaskPriority,
} from "@/domain/types";

export interface TaskDraft {
  title: string;
  description: string;
  taskDate: string;
  priority: TaskPriority;
}

export interface RecurringDraft {
  title: string;
  description: string;
  category: RecurringCategory;
  startDate: string;
  interval: number;
  unit: RecurrenceUnit;
  mode: RecurrenceMode;
  missedPolicy: MissedOccurrencePolicy | null;
  priority: TaskPriority;
  endDate: string | null;
}

export interface FocusProjectDraft {
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
}

export interface WorkEntryDraft {
  entryDate: string;
  title: string;
  content: string;
  result: string;
  tags: string[];
}

export interface LearningEntryDraft {
  entryDate: string;
  title: string;
  content: string;
  sourceUrl: string;
  keyPoints: string;
  nextAction: string;
  tags: string[];
}

export type AssistantDraftAction =
  | { type: "create_task"; data: TaskDraft }
  | { type: "create_backlog_task"; data: TaskDraft }
  | { type: "create_recurring_plan"; data: RecurringDraft }
  | { type: "create_focus_project"; data: FocusProjectDraft }
  | { type: "create_work_entry"; data: WorkEntryDraft }
  | { type: "create_learning_entry"; data: LearningEntryDraft };

export type AssistantResponse =
  | { kind: "answer"; answer: string; references: string[] }
  | { kind: "clarification"; question: string }
  | { kind: "draft_actions"; summary: string; actions: AssistantDraftAction[] };

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, message = "AI 返回格式不正确"): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as UnknownRecord;
}

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}不能为空`);
  const text = value.trim();
  if (text.length > max) throw new Error(`${label}不能超过 ${max} 字`);
  return text;
}

function optionalText(value: unknown, label: string, max: number): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`${label}格式不正确`);
  const text = value.trim();
  if (text.length > max) throw new Error(`${label}不能超过 ${max} 字`);
  return text;
}

function calendarDate(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}日期格式无效`);
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${label}日期格式无效`);
  return value;
}

function optionalDate(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  return calendarDate(value, label);
}

function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T, label: string): T {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !values.includes(value as T)) throw new Error(`${label}不在允许范围内`);
  return value as T;
}

function tags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("标签格式不正确");
  if (value.length > 10) throw new Error("标签最多 10 个");
  return value.map((tag) => requiredText(tag, "标签", 40));
}

function taskDraft(value: unknown): TaskDraft {
  const data = record(value);
  return {
    title: requiredText(data.title, "标题", 200),
    description: optionalText(data.description, "说明", 4000),
    taskDate: calendarDate(data.taskDate, "任务"),
    priority: oneOf(data.priority, ["high", "medium", "low"], "medium", "优先级"),
  };
}

function recurringDraft(value: unknown): RecurringDraft {
  const data = record(value);
  const interval = data.interval;
  if (!Number.isInteger(interval) || (interval as number) < 1 || (interval as number) > 365) throw new Error("周期数字必须是 1 到 365 的整数");
  const mode = oneOf(data.mode, ["fixed", "after_completion"], "fixed", "周期模式");
  const missedPolicy = mode === "fixed"
    ? oneOf(data.missedPolicy, ["catch_up_all", "latest_only"], "latest_only", "漏期策略")
    : null;
  return {
    title: requiredText(data.title, "标题", 200),
    description: optionalText(data.description, "说明", 4000),
    category: oneOf(data.category, ["work", "life"], "work", "周期分类"),
    startDate: calendarDate(data.startDate, "开始"),
    interval: interval as number,
    unit: oneOf(data.unit, ["day", "week", "month", "quarter", "year"], "month", "周期单位"),
    mode,
    missedPolicy,
    priority: oneOf(data.priority, ["high", "medium", "low"], "medium", "优先级"),
    endDate: optionalDate(data.endDate, "结束"),
  };
}

function focusProjectDraft(value: unknown): FocusProjectDraft {
  const data = record(value);
  return {
    name: requiredText(data.name, "标题", 200),
    platformUrl: optionalText(data.platformUrl, "平台链接", 1000),
    owner: optionalText(data.owner, "负责人", 200),
    tier: oneOf(data.tier, ["top", "parallel", "paused"], "parallel", "关注层级"),
    status: oneOf(data.status, ["on_track", "attention", "blocked"], "on_track", "项目状态"),
    currentGoal: optionalText(data.currentGoal, "当前目标", 4000),
    risk: optionalText(data.risk, "风险", 4000),
    nextAction: optionalText(data.nextAction, "下一步", 4000),
    latestConclusion: optionalText(data.latestConclusion, "最新结论", 4000),
    nextReviewDate: calendarDate(data.nextReviewDate, "复查"),
  };
}

function workEntryDraft(value: unknown): WorkEntryDraft {
  const data = record(value);
  return {
    entryDate: calendarDate(data.entryDate, "记录"),
    title: requiredText(data.title, "标题", 200),
    content: optionalText(data.content, "正文", 4000),
    result: optionalText(data.result, "结果", 4000),
    tags: tags(data.tags),
  };
}

function learningEntryDraft(value: unknown): LearningEntryDraft {
  const data = record(value);
  return {
    entryDate: calendarDate(data.entryDate, "记录"),
    title: requiredText(data.title, "标题", 200),
    content: optionalText(data.content, "正文", 4000),
    sourceUrl: optionalText(data.sourceUrl, "来源链接", 1000),
    keyPoints: optionalText(data.keyPoints, "关键点", 4000),
    nextAction: optionalText(data.nextAction, "下一步", 4000),
    tags: tags(data.tags),
  };
}

function draftAction(value: unknown): AssistantDraftAction {
  const action = record(value);
  switch (action.type) {
    case "create_task": return { type: action.type, data: taskDraft(action.data) };
    case "create_backlog_task": return { type: action.type, data: taskDraft(action.data) };
    case "create_recurring_plan": return { type: action.type, data: recurringDraft(action.data) };
    case "create_focus_project": return { type: action.type, data: focusProjectDraft(action.data) };
    case "create_work_entry": return { type: action.type, data: workEntryDraft(action.data) };
    case "create_learning_entry": return { type: action.type, data: learningEntryDraft(action.data) };
    default: throw new Error("AI 返回了不支持的操作");
  }
}

export function parseAssistantResponse(value: unknown): AssistantResponse {
  const response = record(value);
  if (response.kind === "answer") {
    if (typeof response.answer === "string" && response.answer.trim().length > 4000) throw new Error("回答内容过长");
    const answer = requiredText(response.answer, "回答内容", 4000);
    const references = response.references ?? [];
    if (!Array.isArray(references) || references.length > 10) throw new Error("回答依据格式不正确");
    return { kind: "answer", answer, references: references.map((item) => requiredText(item, "回答依据", 80)) };
  }
  if (response.kind === "clarification") {
    return { kind: "clarification", question: requiredText(response.question, "补充问题", 500) };
  }
  if (response.kind === "draft_actions") {
    if (!Array.isArray(response.actions) || response.actions.length === 0) throw new Error("AI 没有返回可新增的内容");
    if (response.actions.length > 5) throw new Error("一次最多新增 5 项");
    return {
      kind: "draft_actions",
      summary: requiredText(response.summary, "草稿说明", 500),
      actions: response.actions.map(draftAction),
    };
  }
  throw new Error("AI 返回格式不正确");
}
