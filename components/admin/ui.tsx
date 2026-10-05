"use client";
import { useId, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";

/** A labelled input or textarea with a one-line hint of where it shows up. */
export function Field({
  label,
  hint,
  value,
  onChange,
  multiline = false,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const shared = {
    id,
    value,
    placeholder,
    maxLength,
    "aria-describedby": hint ? hintId : undefined,
  };
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea rows={3} {...shared} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} {...shared} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && (
        <p className="admin-hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** A titled card; `where` tells which part of the invitation it controls. */
export function Card({
  icon,
  title,
  where,
  children,
}: {
  icon: IconName;
  title: string;
  where?: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-card">
      <header className="admin-card-head">
        <span className="admin-card-icon">
          <Icon name={icon} size={18} />
        </span>
        <h3>{title}</h3>
        {where && <span className="admin-chip">{where}</span>}
      </header>
      <div className="admin-card-body">{children}</div>
    </section>
  );
}

/** A toggle that reads like a switch but is a real checkbox underneath. */
export function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="admin-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="admin-switch-track" aria-hidden="true" />
      <span>{children}</span>
    </label>
  );
}
