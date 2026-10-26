import {
  AlertCircle,
  Bell,
  CheckCheck,
  Clock,
  GraduationCap,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/voto/dates";
import { getCircularCheckStatus, requestCircularCheck } from "@/lib/voto/circulars";
import { useVoto } from "@/lib/voto/store";
import type { NotificationType } from "@/lib/voto/types";
import { CircularViewer } from "./CircularViewer";
import { BottomSheet, Chip, Empty } from "./ui";

export const NOTIF_META: Record<NotificationType, { label: string; icon: typeof Bell }> = {
  note: { label: "Nota", icon: AlertCircle },
  grade: { label: "Voto", icon: GraduationCap },
  reminder: { label: "Promemoria", icon: Clock },
  notice: { label: "Avviso", icon: Megaphone },
};

const PENDING_CHECK_KEY = "voto.circularCheckRequestedAt";

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
  const [checkPending, setCheckPending] = useState(false);
  const [checkNotice, setCheckNotice] = useState<{
    kind: "info" | "success" | "error";
    text: string;
  } | null>(null);
  const [pendingCheckAt, setPendingCheckAt] = useState<string | null>(null);
  const list = [...visibleNotifications]
    .filter((n) => filter === "all" || n.type === filter)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const unreadIds = visibleNotifications.filter((n) => !v.isRead(n.id, n.read)).map((n) => n.id);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PENDING_CHECK_KEY);
      if (saved && Number.isFinite(Date.parse(saved))) {
        setPendingCheckAt(saved);
        setCheckNotice({
          kind: "info",
          text: "Hai un controllo avviato. Verificane lo stato per aggiornare i dati.",
        });
      } else {
        window.localStorage.removeItem(PENDING_CHECK_KEY);
      }
    } catch {
      // Il controllo continua a funzionare anche se il browser blocca lo storage locale.
    }
  }, []);

  const watchCheck = async (requestedAt: string): Promise<boolean | null> => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 10_000));
      const status = await getCircularCheckStatus(requestedAt);
      if (status.status === "completed") return status.conclusion === "success";
    }
    return null;
  };

  const applyCheckResult = async (result: boolean | null) => {
    if (result === null) {
      setCheckNotice({
        kind: "info",
        text: "Il controllo è ancora in corso. Usa ‘Verifica stato’ più tardi per aggiornare i dati.",
      });
      return;
    }
    setPendingCheckAt(null);
    try {
      window.localStorage.removeItem(PENDING_CHECK_KEY);
    } catch {
      // L'eventuale dato locale residuo verrà ignorato al prossimo avvio.
    }
    if (!result) {
      setCheckNotice({ kind: "error", text: "Il controllo non è riuscito. Riprova più tardi." });
      return;
    }
    await v.refresh({ silent: true });
    setCheckNotice({ kind: "success", text: "Controllo terminato: ho aggiornato i dati." });
  };

  const checkCirculars = async () => {
    if (checkPending) return;
    setCheckPending(true);
    setCheckNotice({ kind: "info", text: "Avvio del controllo su DidUP…" });
    try {
      const requestedAt = await requestCircularCheck();
      setPendingCheckAt(requestedAt);
      try {
        window.localStorage.setItem(PENDING_CHECK_KEY, requestedAt);
      } catch {
        // Il polling resta attivo per questa sessione anche senza storage locale.
      }
      setCheckNotice({ kind: "info", text: "Controllo avviato. Attendo il risultato…" });
      await applyCheckResult(await watchCheck(requestedAt));
    } catch (error) {
      setCheckNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Impossibile avviare il controllo.",
      });
    } finally {
      setCheckPending(false);
    }
  };

  const resumeCircularCheck = async () => {
    if (!pendingCheckAt || checkPending) return;
    setCheckPending(true);
    setCheckNotice({ kind: "info", text: "Verifico lo stato del controllo…" });
    try {
      await applyCheckResult(await watchCheck(pendingCheckAt));
    } catch (error) {
      setCheckNotice({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Impossibile leggere lo stato del controllo.",
      });
    } finally {
      setCheckPending(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Notifiche"
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
      <div className="mb-3 space-y-2">
        <button
          type="button"
          disabled={checkPending}
          onClick={() => void checkCirculars()}
          className="press inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-xs font-semibold text-primary disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", checkPending && "animate-spin")} />
          {checkPending ? "Controllo in corso…" : "Controlla nuove circolari"}
        </button>
        {checkNotice && (
          <p
            role={checkNotice.kind === "error" ? "alert" : "status"}
            className={cn(
              "text-xs",
              checkNotice.kind === "error" && "text-destructive",
              checkNotice.kind === "success" && "text-primary",
              checkNotice.kind === "info" && "text-muted-foreground",
            )}
          >
            {checkNotice.text}
          </p>
        )}
        {pendingCheckAt && (
          <button
            type="button"
            disabled={checkPending}
            onClick={() => void resumeCircularCheck()}
            className="press inline-flex h-9 w-full items-center justify-center rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground disabled:opacity-60"
          >
            {checkPending ? "Verifica in corso…" : "Verifica stato del controllo"}
          </button>
        )}
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
          icon={<Bell className="h-6 w-6" />}
          title="Nessuna notifica"
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
          url={circular.attachmentPath ? circular.attachmentUrl : undefined}
        />
      )}
    </BottomSheet>
  );
}
