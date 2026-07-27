"use client";

import { Database, Download, FileJson, FileText, HardDrive, ShieldCheck, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { ConfirmDialog, PageHeader, SaveIndicator } from "@/components/ui";
import { exportJson, exportMarkdown } from "@/domain/export";
import { useWorkspace } from "@/state/workspace-provider";

function downloadText(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SettingsView() {
  const { workspace, saveStatus, error, updateProfile, resetWorkspace } = useWorkspace();
  const [displayName, setDisplayName] = useState(workspace.profile.displayName);
  const [timezone, setTimezone] = useState(workspace.profile.timezone);
  const [confirming, setConfirming] = useState(false);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    await updateProfile({ displayName: displayName.trim() || "朋友", timezone });
  }

  return (
    <section className="view-page settings-page">
      <PageHeader eyebrow="偏好与数据" title="设置" description="管理个人信息和保存在此浏览器中的数据。" action={<SaveIndicator status={saveStatus} />} />
      <section className="mode-banner"><span><HardDrive size={21} /></span><div><strong>当前使用本地模式</strong><p>数据仅保存在这个浏览器，不会自动同步到其他设备。接入 Supabase 后可启用账号和云同步。</p></div><span className="mode-badge">本地</span></section>
      <section className="settings-section"><header><div><h2>个人偏好</h2><p>用于问候语和每日日期计算。</p></div></header><form className="settings-form" onSubmit={saveProfile}><label className="field"><span>显示名称</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label className="field"><span>时区</span><select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option value="Asia/Shanghai">Asia/Shanghai（中国标准时间）</option><option value="Asia/Hong_Kong">Asia/Hong_Kong</option><option value="Asia/Tokyo">Asia/Tokyo</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option></select></label>{error ? <p className="form-error">{error}</p> : null}<div className="form-actions"><button className="button primary" type="submit">保存设置</button></div></form></section>
      <section className="settings-section"><header><div><h2>导出个人数据</h2><p>文件在浏览器中生成，不会上传到网络。</p></div><Download size={19} /></header><div className="export-options"><button aria-label="导出 JSON" type="button" onClick={() => downloadText(exportJson(workspace), `personal-workbench-${new Date().toISOString().slice(0, 10)}.json`, "application/json")}><span><FileJson size={20} /></span><div><strong>导出 JSON</strong><small>完整结构化备份，适合恢复和迁移</small></div></button><button aria-label="导出 Markdown" type="button" onClick={() => downloadText(exportMarkdown(workspace), `personal-workbench-${new Date().toISOString().slice(0, 10)}.md`, "text/markdown")}><span><FileText size={20} /></span><div><strong>导出 Markdown</strong><small>方便阅读、归档和继续整理</small></div></button></div></section>
      <section className="settings-section"><header><div><h2>数据说明</h2><p>当前工作区的数据边界。</p></div><ShieldCheck size={19} /></header><div className="data-facts"><div><Database size={17} /><span><strong>{workspace.tasks.length + workspace.workEntries.length + workspace.learningEntries.length + workspace.dailyReviews.length}</strong><small>本地记录总数</small></span></div><div><HardDrive size={17} /><span><strong>此浏览器</strong><small>当前存储位置</small></span></div></div></section>
      <section className="danger-zone"><div><h2>清空本地数据</h2><p>删除所有任务、记录、复盘和个人设置，并恢复初始示例。</p></div><button className="button danger-outline" type="button" onClick={() => setConfirming(true)}><Trash2 size={16} />清空本地数据</button></section>
      {confirming ? <ConfirmDialog title="确认清空数据" description="所有本地记录都会被删除且无法撤销。建议先导出 JSON 备份。" confirmLabel="清空全部数据" onCancel={() => setConfirming(false)} onConfirm={async () => { await resetWorkspace(); setConfirming(false); }} /> : null}
    </section>
  );
}
