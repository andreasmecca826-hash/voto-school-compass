import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Bell, BookOpen, CalendarClock, CalendarDays, CheckSquare, ClipboardList, Clock3, GraduationCap, LayoutGrid, Menu, RefreshCw, Settings, Trophy, X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useVoto } from "@/lib/voto/store";
import { NotificationsSheet } from "./NotificationsSheet";
import { AchievementsSheet } from "./AchievementsSheet";
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
  { to: "/orario", label: "Orario", icon: CalendarClock },
] as const;
const MORE_NAV = [
  { to: "/", label: "Dashboard", description: "Panoramica scolastica", icon: LayoutGrid, color: "#16a5b8" },
  { to: "/voti", label: "Voti", description: "Voti e medie", icon: BookOpen, color: "#e56b5d" },
  { to: "/compiti", label: "Compiti assegnati", description: "Attività e scadenze", icon: CheckSquare, color: "#6675e8" },
  { to: "/interrogazioni", label: "Interrogazioni", description: "Date e preparazione", icon: CalendarDays, color: "#a66be1" },
  { to: "/orario", label: "Orario", description: "Lezioni della settimana", icon: Clock3, color: "#ea8dae" },
  { to: "/diario", label: "Diario", description: "Attività svolte in classe", icon: ClipboardList, color: "#16a5b8" },
  { to: "/impostazioni", label: "Impostazioni", description: "Personalizza VOTO.", icon: Settings, color: "#19aab6" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const v = useVoto();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [notif, setNotif] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [achievements, setAchievements] = useState(false);
  const [sim, setSim] = useState<{ open: boolean; subjectId?: string }>({ open: false });
  const [subject, setSubject] = useState<string | null>(null);

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
        <header className="glass-panel safe-top sticky top-0 z-30 border-b bg-background/60 md:rounded-t-[2rem]">
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
              <button type="button" onClick={() => setAchievements(true)} className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card" aria-label="Achievement">
                <Trophy className="h-[18px] w-[18px]" />
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

        <main className="flex-1 px-5 pb-28">{v.ready ? (moreOpen ? <MoreMenu v={v} onClose={() => setMoreOpen(false)} onNotifications={() => setNotif(true)} onAchievements={() => setAchievements(true)} onSimulator={() => setSim({ open: true })} /> : children) : <ShellSkeleton />}</main>

        <nav
          className="glass-panel safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t bg-background/60 md:bottom-6 md:rounded-b-[2rem]"
          aria-label="Navigazione principale"
        >
            <ul className="grid grid-cols-3">
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
            <li>
              <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-label="Menu Altro" className={cn("press flex h-16 w-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium", moreOpen ? "text-foreground" : "text-muted-foreground")}>
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", moreOpen && "bg-primary-soft text-primary")}>
                  {moreOpen ? <X className="h-[19px] w-[19px]" /> : <Menu className="h-[19px] w-[19px]" />}
                </span>
                Altro
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {v.ready && (
        <>
          <NotificationsSheet open={notif} onOpenChange={setNotif} />
          <AchievementsSheet open={achievements} onOpenChange={setAchievements} />
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

function MoreMenu({ v, onClose, onNotifications, onAchievements, onSimulator }: { v: ReturnType<typeof useVoto>; onClose: () => void; onNotifications: () => void; onAchievements: () => void; onSimulator: () => void }) {
  const studentName = v.data.student.name || "Studente";
  return (
    <section className="pt-4 pb-5" aria-label="Menu principale">
      <div className="mb-5 flex items-start justify-between">
        <div><button type="button" onClick={onClose} className="press mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Indietro</button><h1 className="font-display text-3xl font-light tracking-tight">Menu</h1><p className="mt-1 text-lg uppercase tracking-wide text-muted-foreground">{studentName}</p></div>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary"><GraduationCap className="h-7 w-7" /></span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MORE_NAV.map(({ to, label, description, icon: Icon, color }) => {
          const active = to === "/" ? false : location.pathname.startsWith(to);
          return <Link key={to} to={to} onClick={onClose} className={cn("press relative flex min-h-40 flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm", active && "border-primary")}>
            <span className="absolute right-0 top-0 flex h-16 w-16 items-center justify-center rounded-bl-[2rem] rounded-tr-2xl" style={{ backgroundColor: color }}><Icon className="h-7 w-7 text-white" /></span>
            <span className="pr-1"><span className="block text-center text-base font-bold leading-tight">{label}</span><span className="mt-1 block text-center text-[10px] text-muted-foreground">{description}</span></span>
          </Link>;
        })}
        <button type="button" onClick={() => { onNotifications(); onClose(); }} className="press relative flex min-h-40 flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
          <span className="absolute right-0 top-0 flex h-16 w-16 items-center justify-center rounded-bl-[2rem] rounded-tr-2xl bg-[#f28f78]"><Bell className="h-7 w-7 text-white" /></span><span className="text-base font-bold">Notifiche</span><span className="mt-1 text-[10px] text-muted-foreground">Avvisi e comunicazioni</span>
        </button>
        <button type="button" onClick={() => { onSimulator(); onClose(); }} className="press relative flex min-h-40 flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
          <span className="absolute right-0 top-0 flex h-16 w-16 items-center justify-center rounded-bl-[2rem] rounded-tr-2xl bg-[#3998d7]"><ClipboardList className="h-7 w-7 text-white" /></span><span className="text-base font-bold">Simulatore</span><span className="mt-1 text-[10px] text-muted-foreground">Calcola il prossimo voto</span>
        </button>
        <button type="button" onClick={() => { onAchievements(); onClose(); }} className="press relative flex min-h-40 flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
          <span className="absolute right-0 top-0 flex h-16 w-16 items-center justify-center rounded-bl-[2rem] rounded-tr-2xl bg-[#8fbe78]"><Trophy className="h-7 w-7 text-white" /></span><span className="text-base font-bold">Traguardi</span><span className="mt-1 text-[10px] text-muted-foreground">I tuoi achievement</span>
        </button>
      </div>
    </section>
  );
}
