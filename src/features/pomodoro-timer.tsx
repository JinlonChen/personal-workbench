"use client";

import { BellRing, CircleStop, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { focusSummaryForDate } from "@/domain/selectors";
import type { PomodoroMinutes, WorkspaceTask } from "@/domain/types";
import { useWorkspace } from "@/state/workspace-provider";
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
} from "./pomodoro-state";

const durations: PomodoroMinutes[] = [15, 25, 45, 60];

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function notifyCompletion(taskTitle: string) {
  try {
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 760;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.45);
    }
  } catch {
    // The visible completion state remains the reliable fallback.
  }
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("专注时间到", { body: `${taskTitle} 已完成本次专注，请返回确认。` });
  }
}

export function PomodoroTimer({ date, tasks }: { date: string; tasks: WorkspaceTask[] }) {
  const { workspace, updateTask, createFocusSession, error } = useWorkspace();
  const eligibleTasks = useMemo(
    () => tasks.filter((task) => task.status === "todo" || task.status === "doing"),
    [tasks],
  );
  const [selectedTaskId, setSelectedTaskId] = useState(eligibleTasks[0]?.id ?? "");
  const [plannedMinutes, setPlannedMinutes] = useState<PomodoroMinutes>(25);
  const [timerState, setTimerState] = useState<LocalPomodoroState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const completionNotified = useRef(false);
  const summary = focusSummaryForDate(workspace.focusSessions, date);

  useEffect(() => {
    const stored = loadPomodoro(window.localStorage);
    if (!stored) return;
    const recovered = recoverPomodoro(stored);
    savePomodoro(window.localStorage, recovered);
    setTimerState(recovered);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (timerState || eligibleTasks.some((task) => task.id === selectedTaskId)) return;
    setSelectedTaskId(eligibleTasks[0]?.id ?? "");
  }, [eligibleTasks, selectedTaskId, timerState]);

  useEffect(() => {
    if (timerState?.status !== "running") return;
    const tick = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      const recovered = recoverPomodoro(timerState, timestamp);
      if (recovered.status !== timerState.status) {
        savePomodoro(window.localStorage, recovered);
        setTimerState(recovered);
      }
    };
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [timerState]);

  useEffect(() => {
    if (timerState?.status !== "awaiting_confirmation" || completionNotified.current) return;
    completionNotified.current = true;
    notifyCompletion(timerState.taskTitle);
  }, [timerState]);

  async function begin() {
    const task = eligibleTasks.find((item) => item.id === selectedTaskId);
    if (!task) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    if (task.status === "todo") await updateTask(task.id, { status: "doing" });
    const next = startPomodoro(task, plannedMinutes);
    completionNotified.current = false;
    savePomodoro(window.localStorage, next);
    setTimerState(next);
    setNow(Date.now());
  }

  function pause() {
    if (!timerState) return;
    const next = pausePomodoro(timerState);
    savePomodoro(window.localStorage, next);
    setTimerState(next);
  }

  function resume() {
    if (!timerState) return;
    const next = resumePomodoro(timerState);
    savePomodoro(window.localStorage, next);
    setTimerState(next);
    setNow(Date.now());
  }

  function abandon() {
    clearPomodoro(window.localStorage);
    setTimerState(null);
    setNow(Date.now());
    completionNotified.current = false;
  }

  async function confirm() {
    if (!timerState || saving) return;
    setSaving(true);
    try {
      const taskStillExists = workspace.tasks.some((task) => task.id === timerState.taskId);
      await createFocusSession({
        id: timerState.sessionId,
        taskId: taskStillExists ? timerState.taskId : null,
        taskTitle: timerState.taskTitle,
        focusDate: date,
        plannedMinutes: timerState.plannedMinutes,
        completedAt: new Date().toISOString(),
      });
      clearPomodoro(window.localStorage);
      setTimerState(null);
      completionNotified.current = false;
    } finally {
      setSaving(false);
    }
  }

  const remaining = timerState
    ? remainingPomodoroMs(timerState, now)
    : plannedMinutes * 60_000;

  return (
    <section className={`pomodoro-panel${timerState ? ` pomodoro-${timerState.status}` : ""}`} aria-labelledby="pomodoro-title">
      <header className="pomodoro-header">
        <div><Timer size={18} aria-hidden="true" /><div><h2 id="pomodoro-title">专注计时</h2><p>只记录完整完成并确认的专注。</p></div></div>
        <span>今日完成 {summary.count} 个番茄 · {summary.minutes} 分钟</span>
      </header>

      {eligibleTasks.length || timerState ? (
        <div className="pomodoro-body">
          <label className="pomodoro-task"><span>专注任务</span><select aria-label="专注任务" value={timerState?.taskId ?? selectedTaskId} disabled={Boolean(timerState)} onChange={(event) => setSelectedTaskId(event.target.value)}>{timerState && !eligibleTasks.some((task) => task.id === timerState.taskId) ? <option value={timerState.taskId}>{timerState.taskTitle}</option> : null}{eligibleTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
          <div className="pomodoro-clock" role="timer" aria-live="off">{formatRemaining(remaining)}</div>
          <div className="pomodoro-durations" aria-label="专注时长">{durations.map((duration) => <button key={duration} className={plannedMinutes === duration ? "active" : ""} type="button" aria-label={`时长 ${duration} 分钟`} aria-pressed={plannedMinutes === duration} disabled={Boolean(timerState)} onClick={() => setPlannedMinutes(duration)}>{duration}</button>)}</div>
          <div className="pomodoro-actions">
            {!timerState ? <button className="button primary" type="button" disabled={!selectedTaskId} onClick={() => void begin()}><Play size={16} />开始专注</button> : null}
            {timerState?.status === "running" ? <button className="button secondary" type="button" onClick={pause}><Pause size={16} />暂停</button> : null}
            {timerState?.status === "paused" ? <button className="button primary" type="button" onClick={resume}><Play size={16} />继续</button> : null}
            {timerState?.status === "awaiting_confirmation" ? <button className="button primary" type="button" disabled={saving} onClick={() => void confirm()}><BellRing size={16} />{saving ? "保存中" : "完成并计入"}</button> : null}
            {timerState ? <button className="button danger-outline" type="button" disabled={saving} onClick={abandon}>{timerState.status === "awaiting_confirmation" ? <RotateCcw size={16} /> : <CircleStop size={16} />}放弃</button> : null}
          </div>
          {timerState?.status === "paused" ? <p className="pomodoro-message">计时已暂停，暂停期间不会减少剩余时间。</p> : null}
          {timerState?.status === "awaiting_confirmation" ? <p className="pomodoro-message complete" role="alert">专注时间已到。确认后，本次时长才会计入任务。</p> : null}
          {error && timerState?.status === "awaiting_confirmation" ? <p className="form-error" role="alert">{error}</p> : null}
        </div>
      ) : <div className="pomodoro-empty"><p>今天还没有可专注的任务。</p></div>}
    </section>
  );
}
