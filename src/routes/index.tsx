import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Calculator, CalendarCheck, ChevronRight, Clock3, Github, Megaphone, Minus, StickyNote } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { AssignmentRow } from "@/components/voto/AssignmentRow";
import { useUi } from "@/components/voto/AppShell";
import { NOTIF_META } from "@/components/voto/NotificationsSheet";
import { Empty, ProgressBar, SectionTitle, Sparkline } from "@/components/voto/ui";
import { cn } from "@/lib/utils";
import { average, averageHistory, fmt, neededGrade, overallAverage } from "@/lib/voto/calc";
import { daysBetween, fmtDate, fmtTime } from "@/lib/voto/dates";
import { useVoto } from "@/lib/voto/store";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — VOTO." },
      { name: "description", content: "Media generale, presenze, compiti e comunicazioni scolastiche." },
      { property: "og:title", content: "Dashboard — VOTO." },
      { property: "og:description", content: "La tua dashboard scolastica personale." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const v = useVoto();
  const ui = useUi();
  const [attendanceView, setAttendanceView] = useState<"hours" | "days">("hours");
  const { subjects, assignments, notifications, previousAverage } = v.data;
  const avg = overallAverage(subjects);
  const history = averageHistory(subjects);
  const delta = avg !== null && previousAverage !== undefined ? avg - previousAverage : null;
  const today = assignments
    .filter((a) => a.dueDate && daysBetween(v.now, a.dueDate) <= 1 && (daysBetween(v.now, a.dueDate) >= 0 || !v.isDone(a.id, a.completed)))
    .sort((a, b) => `${a.dueDate}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate}${b.dueTime ?? ""}`));
  const attendance = v.data.attendance ?? { absenceDays: 0, absenceHours: 0, delays: 0, earlyExits: 0, annualHours: 990, absenceLimitHours: 247.5 };
  const remainingHours = Math.max(0, attendance.absenceLimitHours - attendance.absenceHours);
  const absenceLimitDays = attendance.absenceLimitHours / 6;
  const remainingDays = Math.max(0, absenceLimitDays - attendance.absenceDays);
  const showingDays = attendanceView === "days";
  const notes = notifications.filter((n) => n.type === "note").slice(0, 3);
  const bulletin = notifications.filter((n) => n.type === "notice").slice(0, 3);

  const micro =
    avg === null ? "Nessun voto ancora: il primo arriverà presto."
    : delta !== null && delta > 0.05 ? "Stai migliorando: continua così."
    : delta !== null && delta < -0.05 ? "Leggero calo: punta sulle materie più deboli."
    : avg >= 8 ? "Andamento solido e costante."
    : avg >= 6 ? "Sei in linea, c'è margine per crescere."
    : "Serve un recupero mirato: usa il simulatore.";

  return (
    <div className="pt-3">
      {v.source === "demo" && (
        <Link to="/impostazioni" className="press mb-4 flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft p-3.5">
          <Github className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">Stai vedendo dati DEMO</p>
            <p className="text-[11px] text-muted-foreground">Incolla il tuo URL JSON di GitHub per i dati reali.</p>
          </div>
          <ChevronRight className="h-4 w-4 text-primary" />
        </Link>
      )}

      <section className="card-surface relative overflow-hidden p-5" aria-label="Media generale">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Media generale</p>
          <Sparkline values={history} />
        </div>
        <div className="-mt-4 flex items-baseline gap-1.5">
          <span className="tabular font-display text-6xl font-semibold tracking-tight">{avg === null ? "—" : fmt(avg)}</span>
          <span className="text-lg text-muted-foreground">/10</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {delta === null ? (
            <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted-foreground">Trend non disponibile</span>
          ) : (
            <span
              className={cn(
                "tabular inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                delta > 0.005 ? "bg-success-soft text-success" : delta < -0.005 ? "bg-danger-soft text-danger" : "bg-surface text-muted-foreground",
              )}
            >
              {delta > 0.005 ? <ArrowUpRight className="h-3.5 w-3.5" /> : delta < -0.005 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              {delta > 0 ? "+" : ""}{fmt(delta)} vs {fmt(previousAverage!)}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{micro}</span>
        </div>
        <p className="mt-4 text-[10.5px] text-muted-foreground">
          {v.source === "demo" ? "Dati demo" : `Aggiornato ${fmtTime(v.lastSync)}`}
          {v.error && v.source !== "demo" && <span className="text-danger"> · offline, dati salvati</span>}
        </p>
      </section>

      <button type="button" onClick={() => ui.openSimulator()} className="press card-surface mt-3 flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Calculator className="h-5 w-5" /></span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Che voto mi serve?</span>
          <span className="block text-xs text-muted-foreground">Simula la prossima verifica</span>
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <SectionTitle>Presenze</SectionTitle>
      <section className="card-surface p-4">
        <div className="mb-4 grid grid-cols-2 rounded-xl border border-border bg-surface p-1">
          {(["hours", "days"] as const).map((view) => (
            <button key={view} type="button" onClick={() => setAttendanceView(view)} className={cn("press rounded-lg px-3 py-2 text-xs font-semibold", attendanceView === view ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
              {view === "hours" ? "Ore" : "Giorni"}
            </button>
          ))}
        </div>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Clock3 className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{showingDays ? "Giorni di assenza" : "Ore di assenza"}</p>
            <p className="mt-1 tabular font-display text-3xl font-semibold">{fmt(showingDays ? attendance.absenceDays : attendance.absenceHours, showingDays ? 0 : 1)} <span className="text-sm font-normal text-muted-foreground">/ {fmt(showingDays ? absenceLimitDays : attendance.absenceLimitHours, showingDays ? 2 : 1)} {showingDays ? "giorni" : "ore"}</span></p>
            <p className={cn("mt-1 text-xs", attendance.absenceHours > attendance.absenceLimitHours ? "text-danger" : "text-muted-foreground")}>
              {attendance.absenceHours > attendance.absenceLimitHours ? "Limite del 25% superato" : `Puoi ancora fare ${fmt(showingDays ? remainingDays : remainingHours, showingDays ? 2 : 1)} ${showingDays ? "giorni" : "ore"}`}
            </p>
          </div>
        </div>
        <div className="mt-4"><ProgressBar value={Math.min(100, (attendance.absenceHours / attendance.absenceLimitHours) * 100)} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface p-3"><p className="text-[11px] text-muted-foreground">Ritardi</p><p className="tabular text-xl font-semibold">{attendance.delays}</p><p className="text-[10px] text-muted-foreground">non conteggiati nelle ore</p></div>
          <div className="rounded-xl bg-surface p-3"><p className="text-[11px] text-muted-foreground">Uscite</p><p className="tabular text-xl font-semibold">{attendance.earlyExits}</p><p className="text-[10px] text-muted-foreground">non conteggiate nelle ore</p></div>
        </div>
      </section>

      <SectionTitle action={<Link to="/compiti" className="text-xs font-medium text-primary">Compiti</Link>}>Oggi</SectionTitle>
      {today.length === 0 ? (
        <Empty icon={<CalendarCheck className="h-6 w-6" />} title="Niente in scadenza" text="Nessun compito per oggi o domani." />
      ) : (
        <ul className="space-y-2">{today.map((a) => <AssignmentRow key={a.id} a={a} />)}</ul>
      )}

      <SectionTitle>Note</SectionTitle>
      {notes.length === 0 ? <Empty icon={<StickyNote className="h-6 w-6" />} title="Nessuna nota" /> : <ul className="space-y-2">{notes.map((n) => <NotifItem key={n.id} id={n.id} />)}</ul>}

      <SectionTitle>Bacheca</SectionTitle>
      {bulletin.length === 0 ? <Empty icon={<Megaphone className="h-6 w-6" />} title="Nessuna comunicazione" /> : <ul className="space-y-2">{bulletin.map((n) => <NotifItem key={n.id} id={n.id} />)}</ul>}

      <GoalWidget avg={avg} />
    </div>
  );
}

function NotifItem({ id }: { id: string }) {
  const v = useVoto();
  const n = v.data.notifications.find((x) => x.id === id)!;
  const read = v.isRead(n.id, n.read);
  const M = NOTIF_META[n.type];
  return (
    <li className={cn("card-surface flex items-center gap-3 p-3.5", !read && "border-primary/30")}>
      <span className={cn("flex h-9 min-w-11 items-center justify-center rounded-lg bg-surface", !read && "text-primary")}><M.icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{n.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{M.label}{n.message ? ` · ${n.message}` : ""}</p>
        {n.type === "notice" && <a href="https://www.portaleargo.it/famiglia/" target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center rounded-lg bg-primary-soft px-2.5 py-1.5 text-[11px] font-semibold text-primary">Apri DidUP</a>}
      </div>
      {read ? (
        <span className="text-[11px] text-muted-foreground">{fmtDate(n.date)}</span>
      ) : (
        <button type="button" onClick={() => v.markRead([n.id])} className="press rounded-lg px-2 py-1 text-[11px] font-medium text-primary">Letto</button>
      )}
    </li>
  );
}

function GoalWidget({ avg }: { avg: number | null }) {
  const v = useVoto();
  const { subjects } = v.data;
  const graded = subjects.filter((s) => average(s.grades) !== null);
  const gap = avg === null ? null : v.target - avg;

  let estimate = "Aggiungi voti per una stima.";
  if (avg !== null && gap !== null && graded.length) {
    if (gap <= 0) estimate = "Obiettivo raggiunto: mantieni il ritmo.";
    else {
      const weakest = [...graded].sort((a, b) => average(a.grades)! - average(b.grades)!)[0];
      const sum = graded.reduce((t, s) => t + average(s.grades)!, 0);
      const needAvg = v.target * graded.length - sum + average(weakest.grades)!;
      const r = needAvg <= 10 ? neededGrade(weakest.grades, needAvg, 1) : null;
      estimate = r && r.status === "ok"
        ? `Con un ${fmt(r.needed, 1)} in ${weakest.name} raggiungeresti ${fmt(v.target)}.`
        : `Serve crescere in più materie: in media +${fmt(gap)} ciascuna.`;
    }
  }
  const pct = avg === null ? 0 : Math.min(100, (avg / v.target) * 100);

  return (
    <>
      <SectionTitle>Obiettivo media</SectionTitle>
      <section className="card-surface p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Obiettivo</p>
            <p className="tabular font-display text-3xl font-semibold">{fmt(v.target)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Scarto</p>
            <p className={cn("tabular font-display text-lg font-semibold", gap !== null && gap <= 0 ? "text-success" : "text-primary")}>
              {gap === null ? "—" : gap <= 0 ? "Raggiunto" : `−${fmt(gap)}`}
            </p>
          </div>
        </div>
        <Slider className="mt-4" min={6} max={10} step={0.25} value={[v.target]} onValueChange={([x]) => v.setTarget(x)} aria-label="Obiettivo media generale" />
        <div className="mt-4"><ProgressBar value={pct} /></div>
        <p className="mt-3 text-xs text-muted-foreground">{estimate}</p>
      </section>
    </>
  );
}
