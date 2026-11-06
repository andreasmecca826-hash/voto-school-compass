import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clock3,
  GraduationCap,
  LayoutGrid,
  Menu,
  MessageCircle,
  Newspaper,
  Palette,
  RefreshCw,
  Settings,
  StickyNote,
  UsersRound,
  X,
  Sparkles,
} from "lucide-react";
import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useClock, useVoto } from "@/lib/voto/store";
import { DidupDashboard } from "./DidupDashboard";
import { DidupMenu } from "./DidupMenu";
import { Windows7Orb, Windows7Taskbar } from "./Windows7Chrome";

const NotificationsSheet = lazy(() =>
  import("./NotificationsSheet").then((module) => ({ default: module.NotificationsSheet })),
);
const SimulatorSheet = lazy(() =>
  import("./SimulatorSheet").then((module) => ({ default: module.SimulatorSheet })),
);
const SubjectSheet = lazy(() =>
  import("./SubjectSheet").then((module) => ({ default: module.SubjectSheet })),
);
const MusicPanel = lazy(() =>
  import("./MusicPanel").then((module) => ({ default: module.MusicPanel })),
);

interface UiCtx {
  openMenu: () => void;
  openNotifications: () => void;
  openSimulator: (subjectId?: string) => void;
  openSubject: (id: string) => void;
  openMusic: () => void;
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
  { to: "/voti", label: "Voti", description: "Voti e medie", icon: BookOpen, color: "#e56b5d" },
  {
    to: "/scrutini-infraperiodali",
    label: "Scrutini infraperiodali",
    description: "Crea una pagella manuale",
    icon: GraduationCap,
    color: "#3c9b88",
  },
  {
    to: "/compiti",
    label: "Compiti assegnati",
    description: "Attività e scadenze",
    icon: CheckSquare,
    color: "#6675e8",
  },
  {
    to: "/interrogazioni",
    label: "Interrogazioni",
    description: "Date e preparazione",
    icon: CalendarDays,
    color: "#a66be1",
  },
  {
    to: "/diario",
    label: "Diario",
    description: "Attività svolte in classe",
    icon: ClipboardList,
    color: "#16a5b8",
  },
  {
    to: "/note",
    label: "Note",
    description: "Note disciplinari",
    icon: StickyNote,
    color: "#f28f78",
  },
  {
    to: "/promemoria",
    label: "Promemoria",
    description: "Promemoria dal registro DidUP",
    icon: Clock3,
    color: "#e1a642",
  },
  {
    to: "/professori",
    label: "Professori",
    description: "Docenti e materie",
    icon: UsersRound,
    color: "#4f9bd9",
  },
  {
    to: "/personalizza",
    label: "Personalizza",
    description: "Temi e Home",
    icon: Palette,
    color: "#d97932",
  },
  {
    to: "/impostazioni",
    label: "Impostazioni",
    description: "Connessione e dati",
    icon: Settings,
    color: "#19aab6",
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const v = useVoto();
  const now = useClock();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isWindows7 = v.theme === "windows-7" && v.registryStyle !== "didup";
  const routeTitle = [...NAV, ...MORE_NAV,
    { to: "/studio", label: "Studio Lab." },
    { to: "/assistente", label: "Assistente" },
  ].find(({ to }) => to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`))?.label || "Registro scolastico";
  const [notif, setNotif] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sim, setSim] = useState<{ open: boolean; subjectId?: string | undefined }>({
    open: false,
  });
  const [subject, setSubject] = useState<string | null>(null);
  const [mounted, setMounted] = useState({
    notifications: false,
    simulator: false,
    subject: false,
  });
  const [musicMounted, setMusicMounted] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);

  const handlePullStart = (event: React.TouchEvent<HTMLElement>) => {
    if (v.loading || window.scrollY > 0 || event.touches.length !== 1) return;
    pullStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handlePullMove = (event: React.TouchEvent<HTMLElement>) => {
    if (pullStartY.current === null || v.loading) return;
    const currentY = event.touches[0]?.clientY ?? pullStartY.current;
    const distance = currentY - pullStartY.current;
    if (distance <= 0) {
      setPullDistance(0);
      return;
    }
    if (distance > 8) event.preventDefault();
    setPullDistance(Math.min(84, distance * 0.55));
  };

  const handlePullEnd = () => {
    const shouldRefresh = pullDistance >= 56 && !v.loading;
    pullStartY.current = null;
    setPullDistance(0);
    if (shouldRefresh) void v.refresh();
  };

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  const dateLabel = v.ready
    ? now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <Ui.Provider
      value={{
        openMenu: () => setMoreOpen(true),
        openNotifications: () => {
          setMounted((current) => ({ ...current, notifications: true }));
          setNotif(true);
        },
        openSimulator: (subjectId) => {
          setSubject(null);
          setMounted((current) => ({ ...current, simulator: true }));
          setSim({ open: true, subjectId });
        },
        openSubject: (id) => {
          setMounted((current) => ({ ...current, subject: true }));
          setSubject(id);
        },
        openMusic: () => {
          setMusicMounted(true);
          setMusicOpen(true);
        },
      }}
    >
      {musicMounted && (
        <Suspense fallback={<PanelLoading label="Musica" />}>
          <MusicPanel open={musicOpen} onClose={() => setMusicOpen(false)} />
        </Suspense>
      )}
      <div className={cn("mx-auto flex min-h-dvh w-full max-w-[480px] flex-col md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem] md:border md:border-border md:shadow-2xl", v.registryStyle !== "didup" && "voto-shell", isWindows7 && "windows7-shell")}>
        {v.registryStyle === "didup" ? <div className="hidden" aria-hidden="true" /> : <header className={cn("glass-panel safe-top sticky top-0 z-30 border-b bg-background/60 md:rounded-t-[2rem]", isWindows7 && "windows7-header")}>
          {isWindows7 && (
            <div className="windows7-titlebar">
              <Link to="/" className="windows7-titlebar-brand" aria-label="VOTO. dashboard">
                <Windows7Orb className="windows7-titlebar-icon" />
                <span>VOTO</span>
              </Link>
              <span className="windows7-titlebar-title windows7-titlebar-route">{routeTitle}</span>
            </div>
          )}
          <div className={cn("flex h-16 items-center justify-between px-5", isWindows7 && "windows7-toolbar")}>
            <div className={cn("min-w-0", isWindows7 && "windows7-toolbar-info")}>
              {isWindows7 ? <span className="windows7-toolbar-caption">Registro scolastico</span> : <Link
                to="/"
                className="font-display text-xl font-bold tracking-tight"
                aria-label="VOTO. dashboard"
              >
                VOTO<span className="text-primary">.</span>
              </Link>}
              <p className="truncate text-[11px] capitalize text-muted-foreground">
                {dateLabel || "\u00a0"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {v.source === "demo" && v.ready && (
                <span className="rounded-md border border-primary/40 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-widest text-primary">
                  DEMO
                </span>
              )}
              <Link
                to="/assistente"
                className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
                aria-label="Assistente"
              >
                <MessageCircle className="h-[18px] w-[18px]" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMounted((current) => ({ ...current, notifications: true }));
                  setNotif(true);
                }}
                className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
                aria-label="Novità"
                title="Novità"
              >
                <Newspaper className="h-[18px] w-[18px]" />
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
        </header>}

        <main
          className={cn("relative flex-1", v.registryStyle === "didup" ? "px-0" : "px-5 pb-28", isWindows7 && "windows7-content")}
          onTouchStart={handlePullStart}
          onTouchMove={handlePullMove}
          onTouchEnd={handlePullEnd}
          onTouchCancel={handlePullEnd}
        >
          <div
            className={cn(
              "pointer-events-none flex items-center justify-center overflow-hidden text-xs font-medium text-primary transition-[height,opacity] duration-150",
              pullDistance > 0 ? "opacity-100" : "opacity-0",
            )}
            style={{ height: pullDistance }}
            aria-hidden={pullDistance === 0}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", pullDistance >= 56 && "rotate-180")} />
            {pullDistance >= 56 ? "Rilascia per aggiornare" : "Trascina per aggiornare"}
          </div>
          {v.ready ? (
            moreOpen && !isWindows7 ? (v.registryStyle === "didup" ? <DidupMenu /> : <MoreMenu v={v} currentPath={path} onClose={() => setMoreOpen(false)} />) :
              v.registryStyle === "didup" && path === "/" ? <DidupDashboard /> : children
          ) : (
            <ShellSkeleton />
          )}
        </main>

        {v.registryStyle === "didup" ? <DidupBottomNav path={path} moreOpen={moreOpen} onMenu={() => setMoreOpen((open) => !open)} /> : isWindows7 ? (
          <Windows7Taskbar
            navigation={NAV}
            moreNavigation={MORE_NAV}
            currentPath={path}
            studentName={v.displayName || v.data.student.name || "Studente"}
            now={now}
            ready={v.ready}
            open={moreOpen}
            onOpenChange={setMoreOpen}
          />
        ) : <nav
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
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "press flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                        active && "bg-primary-soft text-primary",
                      )}
                    >
                      <Icon className="h-[19px] w-[19px]" />
                    </span>
                    {label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-expanded={moreOpen}
                aria-label="Menu Altro"
                className={cn(
                  "press flex h-16 w-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium",
                  moreOpen ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    moreOpen && "bg-primary-soft text-primary",
                  )}
                >
                  {moreOpen ? (
                    <X className="h-[19px] w-[19px]" />
                  ) : (
                    <Menu className="h-[19px] w-[19px]" />
                  )}
                </span>
                Altro
              </button>
            </li>
          </ul>
        </nav>}
      </div>

      {v.ready && (mounted.notifications || mounted.simulator || mounted.subject) && (
        <>
          {mounted.notifications && (
            <Suspense fallback={<PanelLoading label="Novità" />}>
              <NotificationsSheet open={notif} onOpenChange={setNotif} />
            </Suspense>
          )}
          {mounted.simulator && (
            <Suspense fallback={<PanelLoading label="Simulatore" />}>
              <SimulatorSheet
                open={sim.open}
                subjectId={sim.subjectId}
                onOpenChange={(o) => setSim((s) => ({ ...s, open: o }))}
              />
            </Suspense>
          )}
          {mounted.subject && (
            <Suspense fallback={<PanelLoading label="Materia" />}>
              <SubjectSheet
                id={subject}
                onClose={() => setSubject(null)}
                onSimulate={(id) => {
                  setSubject(null);
                  setMounted((current) => ({ ...current, simulator: true }));
                  setSim({ open: true, subjectId: id });
                }}
              />
            </Suspense>
          )}
        </>
      )}
    </Ui.Provider>
  );
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-border bg-popover px-4 py-3 text-xs font-medium text-foreground shadow-lg"
    >
      Caricamento {label}…
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-4 pt-4" aria-busy="true" aria-label="Caricamento">
      <Skeleton className="h-44 rounded-2xl bg-card" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl bg-card" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16 rounded-2xl bg-card" />
      ))}
    </div>
  );
}

function DidupBottomNav({
  path,
  moreOpen,
  onMenu,
}: {
  path: string;
  moreOpen: boolean;
  onMenu: () => void;
}) {
  const homeActive = path === "/" && !moreOpen;
  const diaryActive = path.startsWith("/diario") && !moreOpen;
  const menuActive = moreOpen || (!homeActive && !diaryActive);

  return (
    <nav
      className="didup-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[480px] items-end justify-around px-7 pb-3 pt-2"
      aria-label="Navigazione DidUP"
    >
      <Link
        to="/"
        onClick={() => {
          if (moreOpen) onMenu();
        }}
        aria-current={homeActive ? "page" : undefined}
        className={cn("flex flex-col items-center gap-1 text-xs", homeActive ? "text-white" : "text-white/65")}
      >
        <span className={cn("relative flex h-11 w-11 items-center justify-center rounded-full", homeActive && "bg-[#4169a8]")}>
          <img src="/didup-nav-home.png" alt="" aria-hidden="true" className={cn("h-7 w-7 object-contain", homeActive && "brightness-0 invert")} />
        </span>
        Home
      </Link>
      <Link
        to="/diario"
        onClick={() => {
          if (moreOpen) onMenu();
        }}
        aria-current={diaryActive ? "page" : undefined}
        className={cn("flex flex-col items-center gap-1 text-xs", diaryActive ? "text-white" : "text-white/65")}
      >
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", diaryActive && "bg-[#4169a8]")}>
          <img src="/didup-nav-diary.png" alt="" aria-hidden="true" className={cn("h-7 w-7 object-contain", diaryActive && "brightness-0 invert")} />
        </span>
        Diario
      </Link>
      <button
        type="button"
        onClick={onMenu}
        aria-expanded={moreOpen}
        aria-current={menuActive ? "page" : undefined}
        aria-label="Menu"
        className={cn("flex flex-col items-center gap-1 text-xs", menuActive ? "text-white" : "text-white/65")}
      >
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", menuActive && "bg-[#f5b52e]")}>
          <DidupMenuIcon active={menuActive} />
        </span>
        Menu
      </button>
    </nav>
  );
}

function DidupMenuIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("h-6 w-6", active ? "text-white" : "text-[#263b88]")} fill="currentColor">
      {[5, 12, 19].flatMap((x) => [5, 12, 19].map((y) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={x === 12 && y === 12 ? 1.8 : 1.35} />
      )))}
    </svg>
  );
}

function MoreMenu({
  v,
  currentPath,
  onClose,
}: {
  v: ReturnType<typeof useVoto>;
  currentPath: string;
  onClose: () => void;
}) {
  const studentName = v.displayName || v.data.student.name || "Studente";
  return (
    <section className="pt-4 pb-5" aria-label="Menu principale">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <button
            type="button"
            onClick={onClose}
            className="press mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Indietro
          </button>
          <h1 className="font-display text-3xl font-light tracking-tight">Menu</h1>
          <p className="mt-1 text-lg uppercase tracking-wide text-muted-foreground">
            {studentName}
          </p>
        </div>
        <span className="flex h-14 w-14 items-center justify-center text-primary">
          <GraduationCap className="h-7 w-7" />
        </span>
      </div>
      <Button
        asChild
        variant="outline"
        className="mb-5 h-auto min-h-24 w-full justify-start gap-4 whitespace-normal rounded-lg bg-card px-4 py-4 text-left"
      >
        <Link to="/studio" onClick={onClose}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center text-primary">
            <Sparkles />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-semibold">Studio Lab.</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Calcolo media e simulatore · Ruota · Flashcard
            </span>
          </span>
        </Link>
      </Button>
      <div className="grid grid-cols-2 gap-3">
        {MORE_NAV.map(({ to, label, description, icon: Icon, color }) => {
          const active = currentPath.startsWith(to);
          const cardContent = (
            <>
              <span
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center"
              >
                <Icon className="h-7 w-7" style={{ color }} />
              </span>
              <span className="pr-1">
                <span className="block text-center text-base font-bold leading-tight">{label}</span>
                <span className="mt-1 block text-center text-[10px] text-muted-foreground">
                  {description}
                </span>
              </span>
            </>
          );
          return active ? (
            <button
              key={to}
              type="button"
              onClick={onClose}
              className="press relative flex min-h-40 w-full flex-col justify-end overflow-hidden rounded-2xl border border-primary bg-card p-4 text-left shadow-sm"
            >
              {cardContent}
            </button>
          ) : (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className="press relative flex min-h-40 flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-sm"
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
