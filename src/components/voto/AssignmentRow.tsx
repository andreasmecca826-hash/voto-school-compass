import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysBetween, relDay } from "@/lib/voto/dates";
import { recordQuestActivity } from "@/lib/voto/quest-system";
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
        role="checkbox"
        aria-checked={done}
        aria-label={`Segna "${a.title}" come ${done ? "da fare" : "completato"}`}
        onClick={() => {
          if (!done) recordQuestActivity("assignment_completed");
          v.toggleDone(a.id, a.completed);
        }}
        className={cn(
          "press mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2",
          done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
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
