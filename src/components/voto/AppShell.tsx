import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, BookOpen, CheckSquare, LayoutGrid, RefreshCw, Settings } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useVoto } from "@/lib/voto/store";
import { NotificationsSheet } from "./NotificationsSheet";
import { SimulatorSheet } from "./SimulatorSheet";
import { SubjectSheet } from "./SubjectSheet";

interface UiCtx {
  openNotifications: () => void;
  openSimulator: (subjectId?: string) => void;
  openSubject: (id: string) => void;
}
const Ui = createContext<UiCtx | null>(null);
export const useUi = () => {
  const c = useContext(Ui);
  if (!c) throw new Error("useUi fuori da AppShell");
  return c;
};

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/voti", label: "Voti", icon: BookOpen },
  { to: "/compiti", label: "Compiti", icon: CheckSquare },
  { to: "/impostazioni", label: "Impostazioni", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const v = useVoto();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [notif, setNotif] = useState(false);
  const [sim, setSim] = useState<{ open: boolean; subjectId?: string }>({ open: false });
  const [subject, setSubject] = useState<string | null>(null);

  const unread = v.data.notifications.filter((n) => !v.isRead(n.id, n.read)).length;
  const dateLabel = v.ready ? v.now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : "";

  return (
    <Ui.Provider
      value={{
        openNotifications: () => setNotif(true),
        openSimulator: (subjectId) => { setSubject(null); setSim({ open: true, subjectId }); },
        openSubject: (id) => setSubject(id),
      }}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem] md:border md:border-border md:shadow-2xl">
        <header className="safe-top sticky top-0 z-30 bg-background/85 backdrop-blur-xl md:rounded-t-[2rem]">
          <div className="flex h-16 items-center justify-between px-5">
            <div className="min-w-0">
              <Link to="/" className="font-display text-xl font-bold tracking-tight" aria-label="VOTO. dashboard">
                VOTO<span className="text-primary">.</span>
              </Link>
              <p className="truncate text-[11px] capitalize text-muted-foreground">{dateLabel || "\u00a0"}</p>
            </div>
            <div className="flex items-center gap-2">
              {v.source === "demo" && v.ready && (
                <span className="rounded-md border border-primary/40 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-widest text-primary">DEMO</span>
              )}
              <button
                type="button"
                onClick={() => setNotif(true)}
                className="press relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
                aria-label={`Notifiche, ${unread} non lette`}
              >
                <Bell className="h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span className="tabular absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unread}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => v.refresh()}
                disabled={v.loading}
                className="press flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium disabled:opacity-70"
                aria-label="Aggiorna dati"
              >
                <RefreshCw className={cn("h-4 w-4", v.loading && "animate-spin")} />
                Aggiorna
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 pb-28">{v.ready ? children : <ShellSkeleton />}</main>

        <nav
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t border-border bg-background/90 backdrop-blur-xl md:bottom-6 md:rounded-b-[2rem]"
          aria-label="Navigazione principale"
        >
          <ul className="grid grid-cols-4">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? path === "/" : path.startsWith(to);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "press flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary-soft text-primary")}>
                      <Icon className="h-[19px] w-[19px]" />
                    </span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {v.ready && (
        <>
          <NotificationsSheet open={notif} onOpenChange={setNotif} />
          <SimulatorSheet open={sim.open} subjectId={sim.subjectId} onOpenChange={(o) => setSim((s) => ({ ...s, open: o }))} />
          <SubjectSheet id={subject} onClose={() => setSubject(null)} onSimulate={(id) => { setSubject(null); setSim({ open: true, subjectId: id }); }} />
        </>
      )}
    </Ui.Provider>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-4 pt-4" aria-busy="true" aria-label="Caricamento">
      <Skeleton className="h-44 rounded-2xl bg-card" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl bg-card" />)}
      </div>
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl bg-card" />)}
    </div>
  );
}
