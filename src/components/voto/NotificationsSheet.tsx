import { CheckCheck, Newspaper } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/voto/dates";
import { NOTIF_META } from "@/lib/voto/notification-meta";
import { useVoto } from "@/lib/voto/store";
import type { NotificationType } from "@/lib/voto/types";
import { CircularViewer } from "./CircularViewer";
import { BottomSheet, Chip, Empty } from "./ui";

export function NotificationsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const v = useVoto();
  const [filter, setFilter] = useState<NotificationType | "all">("all");
  const visibleNotifications = v.data.notifications;
  const [circular, setCircular] = useState<(typeof visibleNotifications)[number] | null>(null);
  const list = [...visibleNotifications]
    .filter((n) => filter === "all" || n.type === filter)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const unreadIds = visibleNotifications.filter((n) => !v.isRead(n.id, n.read)).map((n) => n.id);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Novità"
      description={`${unreadIds.length} non lette`}
    >
      <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Tutte
        </Chip>
        {(Object.keys(NOTIF_META) as NotificationType[]).map((t) => (
          <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>
            {NOTIF_META[t].label}
          </Chip>
        ))}
      </div>
      <button
        type="button"
        disabled={!unreadIds.length}
        onClick={() => v.markRead(unreadIds)}
        className="press mb-4 inline-flex h-9 items-center gap-2 rounded-lg text-xs font-medium text-primary disabled:text-muted-foreground"
      >
        <CheckCheck className="h-4 w-4" /> Segna tutte come lette
      </button>
      {list.length === 0 ? (
        <Empty
          icon={<Newspaper className="h-6 w-6" />}
          title="Nessuna novità"
          text="Qui compariranno voti, note e promemoria."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((n) => {
            const read = v.isRead(n.id, n.read);
            const M = NOTIF_META[n.type];
            return (
              <li
                key={n.id}
                className={cn("card-surface flex gap-3 p-3.5", !read && "border-primary/30")}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface",
                    !read && "text-primary",
                  )}
                >
                  <M.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{M.label}</span>
                    {n.subject && <span>· {n.subject}</span>}
                    {n.date && <span className="ml-auto">{fmtDate(n.date)}</span>}
                  </div>
                  <p className="mt-0.5 text-sm font-medium">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>}
                  {n.type === "notice" && (
                    <button
                      type="button"
                      onClick={() => {
                        setCircular(n);
                        if (!read) v.markRead([n.id]);
                      }}
                      className="press mt-2 inline-flex max-w-full rounded-lg bg-primary-soft px-2.5 py-1.5 text-[11px] font-semibold text-primary"
                    >
                      Apri circolare
                    </button>
                  )}
                  {!read && (
                    <button
                      type="button"
                      onClick={() => v.markRead([n.id])}
                      className="mt-2 text-xs font-medium text-primary"
                    >
                      Segna come letta
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {circular && (
        <CircularViewer
          open={!!circular}
          onOpenChange={(open) => !open && setCircular(null)}
          title={circular.message ?? circular.title}
          fileName={circular.attachmentName}
          path={circular.attachmentPath}
          url={circular.attachmentPath ? circular.attachmentUrl : undefined}
        />
      )}
    </BottomSheet>
  );
}
