"use client";
// Small accessible UI kit shared by the patient and staff screens.
import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; busy?: boolean };
export function Button({ variant = "primary", busy, className, children, disabled, ...rest }: BtnProps) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-gray-300",
    secondary: "bg-white text-ink border border-line hover:bg-gray-50 disabled:text-gray-400",
    danger: "bg-white text-red-700 border border-red-300 hover:bg-red-50",
    ghost: "text-ink hover:bg-gray-100",
  }[variant];
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition min-h-11", styles, className)}
    >
      {busy && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-white p-4 sm:p-6", className)}>{children}</div>;
}

export function Alert({ kind = "info", title, children }: { kind?: "info" | "success" | "warning" | "error"; title?: string; children?: ReactNode }) {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-green-200 bg-green-50 text-green-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-900",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cx("rounded-lg border p-3 text-sm", styles)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

type FieldProps = { label: string; hint?: string; error?: string | null; children: (id: string, describedBy: string | undefined) => ReactNode };
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {children(id, describedBy)}
      {hint && <p id={hintId} className="text-xs text-muted">{hint}</p>}
      {error && <p id={errId} className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

const inputCls = "block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm min-h-11 aria-[invalid=true]:border-red-500";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} {...p} className={cx(inputCls, className)} />;
});

export function Select({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx(inputCls, className)} />;
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(inputCls, "min-h-24", className)} />;
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "amber" | "red" | "blue" }) {
  const t = { gray: "bg-gray-100 text-gray-800", green: "bg-green-100 text-green-800", amber: "bg-amber-100 text-amber-900", red: "bg-red-100 text-red-800", blue: "bg-blue-100 text-blue-800" }[tone];
  return <span className={cx("inline-block rounded-full px-2 py-0.5 text-xs font-medium", t)}>{children}</span>;
}

export function Spinner({ label = "Načítání…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-muted">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      {label}
    </div>
  );
}
