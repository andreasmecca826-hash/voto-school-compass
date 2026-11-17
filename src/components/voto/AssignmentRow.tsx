import { Check, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysBetween, relDay } from "@/lib/voto/dates";
import { useClock, useVoto } from "@/lib/voto/store";
import type { Assignment } from "@/lib/voto/types";

export function AssignmentRow({ a }: { a: Assignment }) {
  const v = useVoto();
  const now = useClock();
  const done = v.isDone(a.id, a.completed);
  const diff = a.dueDate ? daysBetween(now, a.dueDate) : null;
  const overdue = !done && diff !== null && diff < 0;
  const urgent = !done && diff !== null && diff >= 0 && diff <= 1;

  return (
    <li
      className={cn(
        "card-surface flex items-start gap-3 p-3.5 transition-opacity",
        done && "opacity-55",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={done}
        aria-label={`Stato del compito: ${a.title}`}
        title={done ? "Segna da fare" : "Segna completato"}
        onClick={() => v.toggleDone(a.id, a.completed)}
        className={cn(
          "press mt-0.5 inline-flex min-h-11 min-w-[6.25rem] shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          done
            ? "border-success/30 bg-success/10 text-success"
            : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-primary",
        )}
      >
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full",
            done ? "bg-success text-white" : "bg-muted-foreground/10 text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {done ? <Check className="h-3 w-3" strokeWidth={3} /> : <Circle className="h-3 w-3" />}
        </span>
        <span>{done ? "Fatto" : "Da fare"}</span>
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", done && "line-through")}>{a.title}</p>
        {a.details && <p className="mt-0.5 text-xs text-muted-foreground">{a.details}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {a.subject && <span className="rounded-md bg-surface px-1.5 py-0.5">{a.subject}</span>}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
              overdue
                ? "bg-danger-soft text-danger"
                : urgent
                  ? "bg-primary-soft text-primary"
                  : "bg-surface",
            )}
          >
            <Clock className="h-3 w-3" />
            {overdue ? "Scaduto · " : ""}
            {relDay(now, a.dueDate)}
            {a.dueTime ? ` · ${a.dueTime}` : ""}
          </span>
          {done && <span className="text-success">Completato</span>}
        </div>
      </div>
    </li>
  );
}
