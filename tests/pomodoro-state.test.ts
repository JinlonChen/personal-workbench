import { describe, expect, it } from "vitest";

import {
  clearPomodoro,
  loadPomodoro,
  pausePomodoro,
  recoverPomodoro,
  remainingPomodoroMs,
  resumePomodoro,
  savePomodoro,
  startPomodoro,
  type LocalPomodoroState,
} from "@/features/pomodoro-state";

const task = { id: "task-1", title: "完成方案" };
const startAt = Date.parse("2026-08-13T09:00:00.000Z");

describe("pomodoro state machine", () => {
  it("starts a selected duration and calculates remaining time from its end timestamp", () => {
    const state = startPomodoro(task, 25, startAt);

    expect(state.status).toBe("running");
    expect(state.plannedMinutes).toBe(25);
    expect(state.endsAt).toBe("2026-08-13T09:25:00.000Z");
    expect(remainingPomodoroMs(state, Date.parse("2026-08-13T09:10:00.000Z"))).toBe(15 * 60_000);
  });

  it("pauses without consuming time and resumes with a new end timestamp", () => {
    const running = startPomodoro(task, 25, startAt);
    const paused = pausePomodoro(running, Date.parse("2026-08-13T09:10:00.000Z"));
    expect(paused.status).toBe("paused");
    expect(paused.remainingMs).toBe(15 * 60_000);

    const resumed = resumePomodoro(paused, Date.parse("2026-08-13T10:00:00.000Z"));
    expect(resumed.status).toBe("running");
    expect(resumed.endsAt).toBe("2026-08-13T10:15:00.000Z");
  });

  it("recovers before the deadline and waits for confirmation after expiry", () => {
    const running = startPomodoro(task, 25, startAt);
    expect(recoverPomodoro(running, Date.parse("2026-08-13T09:24:59.000Z")).status).toBe("running");
    expect(recoverPomodoro(running, Date.parse("2026-08-13T09:26:00.000Z")).status).toBe("awaiting_confirmation");
  });

  it("round-trips valid state and clears invalid or abandoned state", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    } as unknown as Storage;
    const state = startPomodoro(task, 15, startAt);

    savePomodoro(adapter, state);
    expect(loadPomodoro(adapter)).toEqual(state);
    storage.set("personal-workbench.pomodoro.v1", "broken");
    expect(loadPomodoro(adapter)).toBeNull();
    savePomodoro(adapter, state);
    clearPomodoro(adapter);
    expect(loadPomodoro(adapter)).toBeNull();
  });

  it("does not auto-complete when the browser clock moves backwards", () => {
    const running = startPomodoro(task, 25, startAt);
    const observed = { ...running, lastObservedAt: "2026-08-13T09:10:00.000Z" } as LocalPomodoroState;

    expect(recoverPomodoro(observed, Date.parse("2026-08-13T08:00:00.000Z")).status).toBe("paused");
  });
});
