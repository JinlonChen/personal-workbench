"use client";

import Image from "next/image";
import { Send, X } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import dragonIcon from "@/assets/ai-assistant-dragon.png";
import { useAuth } from "@/state/auth-provider";
import { useWorkspace } from "@/state/workspace-provider";
import { executeAssistantAction } from "./action-executor";
import { requestAssistant } from "./client";
import { buildAssistantContext } from "./context";
import type { AssistantDraftAction, AssistantResponse } from "./protocol";

interface AssistantMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  references?: string[];
}

interface DraftState {
  id: number;
  response: Extract<AssistantResponse, { kind: "draft_actions" }>;
  completedCount: number;
  status: "pending" | "saving" | "saved";
  error: string | null;
}

const actionLabels: Record<AssistantDraftAction["type"], string> = {
  create_task: "日期任务",
  create_backlog_task: "待办任务",
  create_recurring_plan: "周期任务",
  create_focus_project: "关注项目",
  create_work_entry: "工作记录",
  create_learning_entry: "学习记录",
};

const recurrenceUnitLabels = { day: "天", week: "周", month: "月", quarter: "季度", year: "年" } as const;

function actionTitle(action: AssistantDraftAction): string {
  return action.type === "create_focus_project" ? action.data.name : action.data.title;
}

function actionDetail(action: AssistantDraftAction): string {
  switch (action.type) {
    case "create_task": return action.data.taskDate;
    case "create_backlog_task": return "未排期";
    case "create_recurring_plan": return `每 ${action.data.interval} ${recurrenceUnitLabels[action.data.unit]} · ${action.data.startDate} 开始`;
    case "create_focus_project": return `下次复查 ${action.data.nextReviewDate}`;
    case "create_work_entry":
    case "create_learning_entry": return action.data.entryDate;
  }
}

export function Assistant() {
  const { status: authStatus, session } = useAuth();
  const {
    workspace,
    createTask,
    createRecurringPlan,
    createFocusProject,
    createWorkEntry,
    createLearningEntry,
  } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const draftSequence = useRef(0);
  const requestGeneration = useRef(0);
  const signedIn = authStatus === "signed_in" && Boolean(session);
  const draftBlocksComposer = draft?.status === "pending" || draft?.status === "saving";

  const nextMessage = (role: AssistantMessage["role"], text: string, references?: string[]): AssistantMessage => ({
    id: ++sequence.current,
    role,
    text,
    references,
  });

  async function send(event: FormEvent) {
    event.preventDefault();
    if (loading || draftBlocksComposer || !signedIn || !input.trim()) return;
    const prompt = input.trim();
    const generation = requestGeneration.current;
    setError(null);
    setMessages((current) => [...current, nextMessage("user", prompt)]);
    setLoading(true);
    try {
      const response = await requestAssistant(prompt, buildAssistantContext(workspace));
      if (generation !== requestGeneration.current) return;
      if (response.kind === "answer") {
        setMessages((current) => [...current, nextMessage("assistant", response.answer, response.references)]);
      } else if (response.kind === "clarification") {
        setMessages((current) => [...current, nextMessage("assistant", response.question)]);
      } else {
        setDraft({ id: ++draftSequence.current, response, completedCount: 0, status: "pending", error: null });
      }
      setInput("");
    } catch (reason) {
      if (generation === requestGeneration.current) {
        setError(reason instanceof Error ? reason.message : "AI 服务暂时不可用，请稍后重试。");
      }
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }

  function closeAssistant() {
    requestGeneration.current += 1;
    setOpen(false);
    setInput("");
    setMessages([]);
    setDraft(null);
    setLoading(false);
    setError(null);
  }

  async function confirmDraft() {
    if (!draft || draft.status === "saving" || draft.status === "saved") return;
    const draftId = draft.id;
    setDraft((current) => current?.id === draftId ? { ...current, status: "saving", error: null } : current);
    let completedCount = draft.completedCount;
    try {
      for (let index = completedCount; index < draft.response.actions.length; index += 1) {
        await executeAssistantAction(draft.response.actions[index], {
          createTask,
          createRecurringPlan,
          createFocusProject,
          createWorkEntry,
          createLearningEntry,
        });
        completedCount = index + 1;
        setDraft((current) => current?.id === draftId ? { ...current, completedCount } : current);
      }
      setDraft((current) => current?.id === draftId ? { ...current, completedCount, status: "saved", error: null } : current);
    } catch (reason) {
      setDraft((current) => current?.id === draftId ? {
        ...current,
        completedCount,
        status: "pending",
        error: reason instanceof Error ? reason.message : "保存失败，请检查网络后重试。",
      } : current);
    }
  }

  return (
    <>
      <button
        className="assistant-trigger"
        type="button"
        aria-label="打开 AI 助手"
        title="打开 AI 助手"
        onClick={() => setOpen(true)}
      >
        <Image src={dragonIcon} alt="" width={56} height={56} priority />
      </button>

      {open ? (
        <>
          <div className="assistant-backdrop" role="presentation" onClick={closeAssistant} />
          <section className="assistant-panel" role="dialog" aria-modal="true" aria-label="龍序 AI 助手">
            <header className="assistant-header">
              <div>
                <span>龍序</span>
                <h2 id="assistant-title">AI 助手</h2>
              </div>
              <button className="icon-button" type="button" aria-label="关闭 AI 助手" title="关闭" onClick={closeAssistant}>
                <X size={19} aria-hidden="true" />
              </button>
            </header>

            <div className="assistant-messages" aria-live="polite">
              {!signedIn ? (
                <div className="assistant-empty">
                  <strong>登录云端账号后使用 AI 助手</strong>
                  <p>AI 需要读取当前账号的工作台快照，且新增内容会沿用云端同步。</p>
                </div>
              ) : (
                <>
                  {messages.length === 0 && !draft ? <p className="assistant-welcome">有什么需要整理的，直接告诉我。</p> : null}
                  {messages.map((message) => (
                    <article className={`assistant-message ${message.role}`} key={message.id}>
                      <p>{message.text}</p>
                      {message.references?.length ? <small>依据：{message.references.join("、")}</small> : null}
                    </article>
                  ))}
                  {loading ? <p className="assistant-thinking">正在整理…</p> : null}
                  {error ? <p className="assistant-error" role="alert">{error}</p> : null}
                  {draft ? (
                    <section className="assistant-draft" aria-label="待确认新增">
                      <div className="assistant-draft-heading">
                        <span>{draft.status === "saved" ? "已添加并同步" : "待确认新增"}</span>
                        <p>{draft.response.summary}</p>
                      </div>
                      <div className="assistant-draft-list">
                        {draft.response.actions.map((action, index) => (
                          <div className="assistant-draft-item" key={`${action.type}-${index}`}>
                            <span>{actionLabels[action.type]}</span>
                            <strong>{actionTitle(action)}</strong>
                            <small>{actionDetail(action)}{index < draft.completedCount ? " · 已添加" : ""}</small>
                          </div>
                        ))}
                      </div>
                      {draft.error ? <p className="assistant-error" role="alert">{draft.error}</p> : null}
                      {draft.status !== "saved" ? (
                        <div className="assistant-draft-actions">
                          <button className="button secondary" type="button" disabled={draft.status === "saving"} onClick={() => setDraft(null)}>放弃草稿</button>
                          <button className="button primary" type="button" disabled={draft.status === "saving"} onClick={() => void confirmDraft()}>
                            {draft.status === "saving" ? "正在添加" : "确认添加"}
                          </button>
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </>
              )}
            </div>

            {signedIn ? (
              <form className="assistant-composer" onSubmit={send}>
                <textarea
                  aria-label="给 AI 助手发送消息"
                  maxLength={2000}
                  placeholder="输入内容"
                  rows={3}
                  value={input}
                  disabled={loading || draftBlocksComposer}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
                  }}
                />
                <button className="assistant-send" type="submit" aria-label="发送" title="发送" disabled={loading || draftBlocksComposer || !input.trim()}>
                  <Send size={18} aria-hidden="true" />
                </button>
              </form>
            ) : null}
          </section>
        </>
      ) : null}
    </>
  );
}
