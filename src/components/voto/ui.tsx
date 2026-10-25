import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { fmt, gradeTone } from "@/lib/voto/calc";

export function BottomSheet({ open, onOpenChange, title, description, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border-border bg-popover px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" aria-hidden />
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="font-display text-xl tracking-tight">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

export function SubjectMark({ name, color, size = 40 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-xl bg-surface font-display text-xs font-semibold text-foreground"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
      <span className="absolute bottom-1.5 h-0.5 w-3 rounded-full" style={{ background: color ?? "currentColor" }} />
    </span>
  );
}

export function GradePill({ value, label, className }: { value: number | null; label?: string; className?: string }) {
  const tone = gradeTone(value);
  return (
    <span
      className={cn(
        "tabular inline-flex min-w-11 items-center justify-center rounded-lg px-2 py-1 font-display text-sm font-semibold",
        tone === "bad" && "bg-danger-soft text-danger",
        tone === "good" && "bg-success-soft text-success",
        tone === "ok" && "bg-surface text-foreground",
        tone === "muted" && "bg-surface text-muted-foreground",
        className,
      )}
    >
      {label ?? (value === null ? "—" : fmt(value, 2))}
    </span>
  );
}

export function Chip({ children, active, onClick, className }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  const Cmp = onClick ? "button" : "span";
  return (
    <Cmp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        "press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium",
        active ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground",
        onClick && !active && "hover:text-foreground",
        className,
      )}
    >
      {children}
    </Cmp>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-baseline justify-between">
      <h2 className="font-display text-[15px] font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function Empty({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 text-muted-foreground">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {text && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{text}</p>}
    </div>
  );
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return <div className={cn("h-12", className)} />;
  const w = 140, h = 48, p = 4;
  const min = Math.min(...values) - 0.2, max = Math.max(...values) + 0.2;
  const pts = values.map((v, i) => [p + (i * (w - 2 * p)) / (values.length - 1), h - p - ((v - min) / (max - min)) * (h - 2 * p)]);
  const d = pts.map((pt, i) => `${i ? "L" : "M"}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-12 w-[140px] text-primary", className)} aria-hidden>
      <path d={`${d} L${last[0]},${h} L${pts[0][0]},${h} Z`} fill="currentColor" opacity="0.08" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />
    </svg>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface">
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}
