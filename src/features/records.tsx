"use client";

import { BookOpen, BriefcaseBusiness, ExternalLink, Pencil, Plus, Search, Tag, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { ConfirmDialog, EmptyState, Modal, PageHeader, SaveIndicator } from "@/components/ui";
import { todayKey } from "@/domain/date";
import { filterLearningEntries, filterWorkEntries } from "@/domain/selectors";
import type { LearningEntry, LearningEntryInput, WorkEntry, WorkEntryInput } from "@/domain/types";
import { useWorkspace } from "@/state/workspace-provider";

type RecordKind = "work" | "learning";

function splitTags(value: string) {
  return [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))];
}

function WorkEntryForm({ entry, date, onClose }: { entry?: WorkEntry; date: string; onClose: () => void }) {
  const { workspace, createWorkEntry, updateWorkEntry, error } = useWorkspace();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [result, setResult] = useState(entry?.result ?? "");
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? date);
  const [taskId, setTaskId] = useState(entry?.taskId ?? "");
  const [tags, setTags] = useState(entry?.tags.join("，") ?? "");
  const [validation, setValidation] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setValidation("请填写工作标题和内容");
      return;
    }
    const input: WorkEntryInput = { title: title.trim(), content: content.trim(), result: result.trim(), entryDate, taskId: taskId || null, tags: splitTags(tags) };
    try {
      if (entry) await updateWorkEntry(entry.id, input);
      else await createWorkEntry(input);
      onClose();
    } catch {
      // Keep the draft visible when persistence fails.
    }
  }

  return (
    <Modal title={entry ? "编辑工作记录" : "新建工作记录"} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>工作标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
        <label className="field"><span>工作内容</span><textarea rows={4} value={content} onChange={(event) => setContent(event.target.value)} /></label>
        <label className="field"><span>产出或结果 <small>可选</small></span><textarea rows={2} value={result} onChange={(event) => setResult(event.target.value)} /></label>
        <div className="form-grid">
          <label className="field"><span>日期</span><input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></label>
          <label className="field"><span>关联任务 <small>可选</small></span><select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">不关联</option>{workspace.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
        </div>
        <label className="field"><span>标签 <small>使用逗号分隔</small></span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="项目，客户" /></label>
        {validation || error ? <p className="form-error" role="alert">{validation || error}</p> : null}
        <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>取消</button><button className="button primary" type="submit">保存工作记录</button></div>
      </form>
    </Modal>
  );
}

function LearningEntryForm({ entry, date, onClose }: { entry?: LearningEntry; date: string; onClose: () => void }) {
  const { createLearningEntry, updateLearningEntry, error } = useWorkspace();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [sourceUrl, setSourceUrl] = useState(entry?.sourceUrl ?? "");
  const [keyPoints, setKeyPoints] = useState(entry?.keyPoints ?? "");
  const [nextAction, setNextAction] = useState(entry?.nextAction ?? "");
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? date);
  const [tags, setTags] = useState(entry?.tags.join("，") ?? "");
  const [validation, setValidation] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setValidation("请填写学习标题和内容");
      return;
    }
    if (sourceUrl && !URL.canParse(sourceUrl)) {
      setValidation("来源链接格式不正确");
      return;
    }
    const input: LearningEntryInput = { title: title.trim(), content: content.trim(), sourceUrl: sourceUrl.trim(), keyPoints: keyPoints.trim(), nextAction: nextAction.trim(), entryDate, tags: splitTags(tags) };
    try {
      if (entry) await updateLearningEntry(entry.id, input);
      else await createLearningEntry(input);
      onClose();
    } catch {
      // Keep the draft visible when persistence fails.
    }
  }

  return (
    <Modal title={entry ? "编辑学习记录" : "新建学习记录"} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field"><span>学习标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
        <label className="field"><span>学习内容</span><textarea rows={4} value={content} onChange={(event) => setContent(event.target.value)} /></label>
        <label className="field"><span>关键要点 <small>可选</small></span><textarea rows={3} value={keyPoints} onChange={(event) => setKeyPoints(event.target.value)} /></label>
        <label className="field"><span>下一步行动 <small>可选</small></span><input value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></label>
        <div className="form-grid">
          <label className="field"><span>日期</span><input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></label>
          <label className="field"><span>来源链接 <small>可选</small></span><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></label>
        </div>
        <label className="field"><span>标签 <small>使用逗号分隔</small></span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="技术，阅读" /></label>
        {validation || error ? <p className="form-error" role="alert">{validation || error}</p> : null}
        <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>取消</button><button className="button primary" type="submit">保存学习记录</button></div>
      </form>
    </Modal>
  );
}

function RecordCard({ kind, entry }: { kind: RecordKind; entry: WorkEntry | LearningEntry }) {
  const { deleteWorkEntry, deleteLearningEntry } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const work = kind === "work" ? entry as WorkEntry : null;
  const learning = kind === "learning" ? entry as LearningEntry : null;

  return (
    <>
      <article className="record-card">
        <header><span className={`record-kind ${kind}`}>{kind === "work" ? <BriefcaseBusiness size={15} /> : <BookOpen size={15} />}{kind === "work" ? "工作" : "学习"}</span><time>{entry.entryDate}</time></header>
        <h3>{entry.title}</h3>
        <p>{entry.content}</p>
        {work?.result ? <div className="record-detail"><strong>结果</strong><span>{work.result}</span></div> : null}
        {learning?.keyPoints ? <div className="record-detail"><strong>要点</strong><span>{learning.keyPoints}</span></div> : null}
        {learning?.nextAction ? <div className="record-detail"><strong>下一步</strong><span>{learning.nextAction}</span></div> : null}
        <footer>
          <div className="tags">{entry.tags.map((tag) => <span key={tag}><Tag size={11} />{tag}</span>)}{learning?.sourceUrl ? <a href={learning.sourceUrl} target="_blank" rel="noreferrer">来源<ExternalLink size={12} /></a> : null}</div>
          <div className="row-actions record-actions"><button className="icon-button" type="button" onClick={() => setEditing(true)} aria-label={`编辑 ${entry.title}`}><Pencil size={16} /></button><button className="icon-button danger-text" type="button" onClick={() => setConfirming(true)} aria-label={`删除 ${entry.title}`}><Trash2 size={16} /></button></div>
        </footer>
      </article>
      {editing && work ? <WorkEntryForm entry={work} date={work.entryDate} onClose={() => setEditing(false)} /> : null}
      {editing && learning ? <LearningEntryForm entry={learning} date={learning.entryDate} onClose={() => setEditing(false)} /> : null}
      {confirming ? <ConfirmDialog title="确认删除记录" description={`“${entry.title}”将从本地记录中永久删除。`} confirmLabel="确认删除" onCancel={() => setConfirming(false)} onConfirm={() => kind === "work" ? deleteWorkEntry(entry.id) : deleteLearningEntry(entry.id)} /> : null}
    </>
  );
}

export function RecordsView() {
  const { workspace, saveStatus, syncMode } = useWorkspace();
  const date = todayKey(workspace.profile.timezone);
  const [kind, setKind] = useState<RecordKind>("work");
  const [creating, setCreating] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [tag, setTag] = useState("");
  const allTags = useMemo(() => [...new Set([...workspace.workEntries, ...workspace.learningEntries].flatMap((entry) => entry.tags))].sort(), [workspace]);
  const entries = kind === "work"
    ? filterWorkEntries(workspace.workEntries, { keyword, date: dateFilter, tag })
    : filterLearningEntries(workspace.learningEntries, { keyword, date: dateFilter, tag });

  return (
    <section className="view-page">
      <PageHeader eyebrow="工作与学习" title="记录" description="把做过的事和新获得的认识留下来。" action={<button className="button primary" type="button" onClick={() => setCreating(true)}><Plus size={17} />新建记录</button>} />
      <div className="record-controls">
        <div className="segmented" aria-label="记录类型"><button type="button" className={kind === "work" ? "active" : ""} aria-pressed={kind === "work"} onClick={() => { setKind("work"); setKeyword(""); }}>工作记录</button><button type="button" className={kind === "learning" ? "active" : ""} aria-pressed={kind === "learning"} onClick={() => { setKind("learning"); setKeyword(""); }}>学习记录</button></div>
        <SaveIndicator status={saveStatus} mode={syncMode} />
      </div>
      <div className="filter-row">
        <label className="search-field"><Search size={16} aria-hidden="true" /><span className="sr-only">搜索记录</span><input aria-label="搜索记录" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题、内容或标签" /></label>
        <label className="compact-field"><span className="sr-only">筛选日期</span><input aria-label="筛选日期" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
        <label className="compact-field"><span className="sr-only">筛选标签</span><select aria-label="筛选标签" value={tag} onChange={(event) => setTag(event.target.value)}><option value="">全部标签</option>{allTags.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      {entries.length ? <div className="record-grid">{entries.map((entry) => <RecordCard key={entry.id} kind={kind} entry={entry} />)}</div> : <EmptyState icon={kind === "work" ? <BriefcaseBusiness size={22} /> : <BookOpen size={22} />} title={keyword || dateFilter || tag ? "没有匹配的记录" : `还没有${kind === "work" ? "工作" : "学习"}记录`} description={keyword || dateFilter || tag ? "调整筛选条件再试一次。" : "及时写下，晚上复盘会更轻松。"} />}
      {creating && kind === "work" ? <WorkEntryForm date={date} onClose={() => setCreating(false)} /> : null}
      {creating && kind === "learning" ? <LearningEntryForm date={date} onClose={() => setCreating(false)} /> : null}
    </section>
  );
}
