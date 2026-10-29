import { Bell, CalendarCheck2, CircleUserRound, ClipboardList, X } from "lucide-react";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useClock, useVoto } from "@/lib/voto/store";
import { average, fmt, overallAverage } from "@/lib/voto/calc";
import { daysBetween, fmtDate } from "@/lib/voto/dates";
import { cn } from "@/lib/utils";

function updatedLabel(value: string | null, now: Date) {
  const date = value ? new Date(value) : now;
  const time = date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const day = date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
  return `Dati aggiornati alle ${time} del ${day}`;
}

function dateLabel(iso?: string) {
  return iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }).toUpperCase() : "";
}

export function DidupDashboard() {
  const v = useVoto();
  const now = useClock();
  const { subjects, assignments, notifications, attendance } = v.data;
  const avg = useMemo(() => overallAverage(subjects), [subjects]);
  const openAssignments = useMemo(
    () => assignments.filter((item) => !v.isDone(item.id, item.completed)).sort((a, b) => `${a.dueDate ?? "9999"}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate ?? "9999"}${b.dueTime ?? ""}`)),
    [assignments, v.isDone],
  );
  const latestGrades = useMemo(
    () => subjects.flatMap((subject) => subject.grades.map((grade) => ({ subject, grade }))).sort((a, b) => b.grade.date.localeCompare(a.grade.date)),
    [subjects],
  );
  const notices = useMemo(
    () => notifications.filter((item) => item.type === "notice").sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [notifications],
  );
  const reminders = useMemo(
    () => notifications.filter((item) => item.type === "reminder").sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    [notifications],
  );
  const next = openAssignments[0];
  const studentName = (v.data.student.name || "ANDREA MARIA").toUpperCase();

  return (
    <div className="didup-page min-h-dvh bg-black px-2 pb-24 text-white">
      <header className="flex items-center justify-between px-3 pb-5 pt-4">
        <div>
          <h1 className="text-[24px] font-normal tracking-tight">{studentName}</h1>
          <p className="text-[11px] text-white/65">{updatedLabel(v.lastSync, now)}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#02a6b5]"><CircleUserRound className="h-8 w-8" /></div>
      </header>

      <section className="didup-card grid grid-cols-2 gap-3 p-4">
        <div className="border-r border-[#10c5d0] pr-3 text-center">
          <p className="text-sm font-bold">Media</p>
          <div className="mx-auto mt-3 flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-l-[#4cc477] border-b-[#4cc477] border-r-[#4cc477] border-t-transparent text-xl font-bold">{avg === null ? "—" : fmt(avg)}</div>
          <p className="mt-3 text-[11px] italic text-white/80">Calcolata nel periodo</p>
          <p className="text-[11px] italic text-white/80">{subjects.length} materie</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold">Prepara lo zaino!</p>
          <div className="mx-auto mt-3 flex h-20 w-20 items-center justify-center text-6xl">🎒</div>
          <p className="mt-3 text-[11px] italic text-white/80">{next ? `Controlla ${next.subject ?? "i compiti"}` : "Nessun compito urgente"}</p>
        </div>
        <div className="col-span-2 border-t border-[#10c5d0] pt-3">
          <div className="grid grid-cols-3 text-center text-[11px] font-bold uppercase">
            <span>Assenze<strong className="mt-1 block text-base">{Math.round(attendance.absenceDays)}</strong></span>
            <span>Ritardi<strong className="mt-1 block text-base">{attendance.delays}</strong></span>
            <span>Uscite<strong className="mt-1 block text-base">{attendance.earlyExits}</strong></span>
          </div>
        </div>
      </section>

      <DidupSectionTitle title="Prossimi compiti" href="/compiti" />
      <DidupScroller>
        {openAssignments.slice(0, 5).map((item) => (
          <article key={item.id} className="didup-tile flex min-h-40 w-[78%] shrink-0 flex-col p-4">
            <div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-medium uppercase text-white/80">{item.subject ?? "COMPITO"}</p><span>📌</span></div>
            <p className="mt-3 line-clamp-3 text-sm leading-5">{item.title}{item.details ? `: ${item.details}` : ""}</p>
            <p className="mt-auto border-t border-white/20 pt-3 text-center text-[10px] uppercase text-white/70">Consegna {dateLabel(item.dueDate)}</p>
          </article>
        ))}
      </DidupScroller>

      <DidupSectionTitle title="Eventi appello" href="/interrogazioni" />
      <section className="didup-card divide-y divide-white/10 px-4">
        {(v.interrogazioni.length ? v.interrogazioni.slice(0, 4).map((item) => ({ id: item.id, title: item.subject, subtitle: item.notes || "Da preparare", date: dateLabel(item.date), icon: <X /> })) : [{ id: "absence", title: "Nessun evento", subtitle: "Le assenze e gli eventi compariranno qui", date: "", icon: <CalendarCheck2 /> }]).map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-3"><span className="text-[#08b8c4]">{item.icon}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-[#e97988]">{item.subtitle}</p></div><span className="text-xs text-[#08b8c4]">{item.date}</span></div>
        ))}
      </section>

      <DidupSectionTitle title="Ultimi voti" href="/voti" />
      <DidupScroller>
        {latestGrades.slice(0, 5).map(({ subject, grade }) => (
          <article key={grade.id} className="didup-tile relative min-h-36 w-[78%] shrink-0 p-4"><span className="absolute right-0 top-0 rounded-bl-3xl bg-[#40d596] px-5 py-3 text-xl font-bold">{grade.label}</span><p className="text-[10px] text-[#08b8c4]">{dateLabel(grade.date)}</p><p className="mt-4 text-sm font-medium uppercase">{subject.name}</p><p className="mt-1 text-xs text-white/75">{grade.comment || grade.type}</p></article>
        ))}
      </DidupScroller>

      <DidupSectionTitle title="Bacheca" href="/" />
      <DidupScroller>
        {notices.slice(0, 5).map((item) => <article key={item.id} className="didup-tile min-h-44 w-[78%] shrink-0 p-4"><div className="flex justify-between"><p className="text-[10px] text-[#08b8c4]">{dateLabel(item.date)}</p><span className="rounded-full bg-[#04aeba] p-2"><Bell className="h-4 w-4" /></span></div><p className="mt-2 text-base uppercase">Circolari</p><p className="text-xs text-white/70">{item.title}</p><p className="mt-4 line-clamp-3 text-sm">{item.message}</p></article>)}
      </DidupScroller>

      <DidupSectionTitle title="Promemoria" href="/" />
      <DidupScroller>
        {(reminders.length ? reminders : [{ id: "empty", title: "Nessun promemoria", message: "I prossimi promemoria appariranno qui." }]).map((item) => <article key={item.id} className="didup-tile min-h-36 w-[78%] shrink-0 p-4"><div className="flex justify-between"><p className="text-[10px] text-[#08b8c4]">{dateLabel(item.date)}</p><span className="rounded-full bg-[#ff5264] p-2"><ClipboardList className="h-4 w-4" /></span></div><p className="mt-5 text-sm">{item.message || item.title}</p></article>)}
      </DidupScroller>
    </div>
  );
}

function DidupSectionTitle({ title, href }: { title: string; href: string }) {
  return <div className="mt-7 flex items-center justify-between px-2"><h2 className="text-xl font-bold">{title}</h2><Link to={href} className="text-xs text-white/75">Vedi tutti ›</Link></div>;
}

function DidupScroller({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar mt-2 flex gap-3 overflow-x-auto px-0.5">{children}</div>;
}
