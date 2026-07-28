"use client";

import { AlertTriangle, Check, Cloud, CloudOff, LoaderCircle, X } from "lucide-react";
import type { ReactNode } from "react";

import type { SaveStatus } from "@/domain/types";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </header>
  );
}

export function SaveIndicator({ status, mode = "local" }: { status: SaveStatus; mode?: "local" | "cloud" }) {
  const content = {
    idle: { icon: mode === "cloud" ? Cloud : CloudOff, label: mode === "cloud" ? "云端同步" : "本地模式" },
    saving: { icon: LoaderCircle, label: "保存中" },
    saved: { icon: Check, label: "已保存" },
    error: { icon: AlertTriangle, label: "保存失败" },
  }[status];
  const Icon = content.icon;
  return (
    <span className={`save-indicator save-${status}`} role="status">
      <Icon size={14} aria-hidden="true" />{content.label}
    </span>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = `modal-${title}`;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label={`关闭${title}`}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const titleId = `confirm-${title}`;
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="danger-icon"><AlertTriangle size={20} aria-hidden="true" /></span>
        <div>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onCancel}>取消</button>
          <button className="button danger" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
