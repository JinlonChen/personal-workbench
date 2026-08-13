import type { PomodoroMinutes } from "@/domain/types";

export const POMODORO_STORAGE_KEY = "personal-workbench.pomodoro.v1";
const CLOCK_ROLLBACK_TOLERANCE_MS = 5_000;

export type PomodoroStatus = "running" | "paused" | "awaiting_confirmation";

export interface LocalPomodoroState {
  version: 1;
  sessionId: string;
  status: PomodoroStatus;
  taskId: string;
  taskTitle: string;
  plannedMinutes: PomodoroMinutes;
  startedAt: string;
  endsAt: string | null;
  remainingMs: number | null;
  lastObservedAt: string;
}

type TaskReference = { id: string; title: string };

function iso(timestamp: number) {
  return new Date(timestamp).toISOString();
}

function isValidState(value: unknown): value is LocalPomodoroState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<LocalPomodoroState>;
  return state.version === 1
    && typeof state.sessionId === "string"
    && ["running", "paused", "awaiting_confirmation"].includes(state.status ?? "")
    && typeof state.taskId === "string"
    && typeof state.taskTitle === "string"
    && [15, 25, 45, 60].includes(state.plannedMinutes ?? 0)
    && typeof state.startedAt === "string"
    && (state.endsAt === null || typeof state.endsAt === "string")
    && (state.remainingMs === null || typeof state.remainingMs === "number")
    && typeof state.lastObservedAt === "string";
}

export function startPomodoro(task: TaskReference, plannedMinutes: PomodoroMinutes, timestamp = Date.now()): LocalPomodoroState {
  const durationMs = plannedMinutes * 60_000;
  return {
    version: 1,
    sessionId: crypto.randomUUID(),
    status: "running",
    taskId: task.id,
    taskTitle: task.title,
    plannedMinutes,
    startedAt: iso(timestamp),
    endsAt: iso(timestamp + durationMs),
    remainingMs: null,
    lastObservedAt: iso(timestamp),
  };
}

export function remainingPomodoroMs(state: LocalPomodoroState, timestamp = Date.now()): number {
  if (state.status === "paused") return Math.max(0, state.remainingMs ?? 0);
  if (state.status === "awaiting_confirmation") return 0;
  return Math.max(0, Date.parse(state.endsAt ?? state.lastObservedAt) - timestamp);
}

export function pausePomodoro(state: LocalPomodoroState, timestamp = Date.now()): LocalPomodoroState {
  if (state.status !== "running") return state;
  return {
    ...state,
    status: "paused",
    endsAt: null,
    remainingMs: remainingPomodoroMs(state, timestamp),
    lastObservedAt: iso(timestamp),
  };
}

export function resumePomodoro(state: LocalPomodoroState, timestamp = Date.now()): LocalPomodoroState {
  if (state.status !== "paused" || !state.remainingMs) return state;
  return {
    ...state,
    status: "running",
    endsAt: iso(timestamp + state.remainingMs),
    remainingMs: null,
    lastObservedAt: iso(timestamp),
  };
}

export function recoverPomodoro(state: LocalPomodoroState, timestamp = Date.now()): LocalPomodoroState {
  const previousTimestamp = Date.parse(state.lastObservedAt);
  if (Number.isFinite(previousTimestamp) && timestamp < previousTimestamp - CLOCK_ROLLBACK_TOLERANCE_MS) {
    return pausePomodoro(state, previousTimestamp);
  }
  if (state.status === "running" && remainingPomodoroMs(state, timestamp) <= 0) {
    return { ...state, status: "awaiting_confirmation", endsAt: null, remainingMs: 0, lastObservedAt: iso(timestamp) };
  }
  return { ...state, lastObservedAt: iso(timestamp) };
}

export function loadPomodoro(storage: Storage): LocalPomodoroState | null {
  const stored = storage.getItem(POMODORO_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!isValidState(parsed)) {
      storage.removeItem(POMODORO_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(POMODORO_STORAGE_KEY);
    return null;
  }
}

export function savePomodoro(storage: Storage, state: LocalPomodoroState) {
  storage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(state));
}

export function clearPomodoro(storage: Storage) {
  storage.removeItem(POMODORO_STORAGE_KEY);
}
