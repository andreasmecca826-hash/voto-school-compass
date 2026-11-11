import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calculator,
  ChevronRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useUi } from "@/components/voto/AppShell";
import { PeriodPicker } from "@/components/voto/PeriodPicker";
import { Chip, GradePill, ProgressBar, SubjectMark } from "@/components/voto/ui";
import { fmt, gradeTone, overallAverage, subjectStats } from "@/lib/voto/calc";
import { useSchoolPeriods } from "@/lib/voto/periods-context";
import { useVoto } from "@/lib/voto/store";
import type { PeriodSelection } from "@/lib/voto/periods";

export const Route = createFileRoute("/voti")({
  head: () => ({
    meta: [
      { title: "Voti — VOTO." },
      { name: "description", content: "Medie e voti per materia." },
      { property: "og:title", content: "Voti — VOTO." },
      { property: "og:description", content: "Medie e voti per materia." },
    ],
  }),
  component: Voti,
});

type Sort = "nome" | "alta" | "bassa";

const DIDUP_PERIODS: { value: PeriodSelection; label: string }[] = [
  { value: "first", label: "Primo trimestre" },
  { value: "second", label: "Scrutinio finale" },
  { value: "all", label: "Intero anno" },
];

function Voti() {
  const { subjects, config, update } = useSchoolPeriods();
  const v = useVoto();
  const ui = useUi();
  const [sort, setSort] = useState<Sort>("nome");
  const [didupPeriod, setDidupPeriod] = useState<PeriodSelection>("first");
  const firstPeriodEnd = `${config.year}-12-15`;
  const schoolYearStart = `${config.year}-09-15`;
  const schoolYearEnd = `${config.year + 1}-08-31`;
  const list = subjects
    .map((s) => ({
      s,
      st: subjectStats(s),
      latestGrade: [...s.grades].sort((a, b) => b.date.localeCompare(a.date))[0],
    }))
    .sort((a, b) =>
      sort === "nome"
        ? a.s.name.localeCompare(b.s.name)
        : sort === "alta"
          ? (b.st.avg ?? 0) - (a.st.avg ?? 0)
          : (a.st.avg ?? 0) - (b.st.avg ?? 0),
    );
  const didupList = useMemo(
    () =>
      v.data.subjects
        .map((subject) => ({
          ...subject,
          grades: subject.grades.filter((grade) => {
            const day = grade.date.slice(0, 10);
            if (day < schoolYearStart || day > schoolYearEnd) return false;
            if (didupPeriod === "first") return day <= firstPeriodEnd;
            if (didupPeriod === "second") return day > firstPeriodEnd;
            return true;
          }),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [v.data.subjects, schoolYearStart, schoolYearEnd, firstPeriodEnd, didupPeriod],
  );
  const didupRange: [string, string] =
    didupPeriod === "first"
      ? [schoolYearStart, firstPeriodEnd]
      : didupPeriod === "second"
        ? [`${config.year}-12-16`, schoolYearEnd]
        : [schoolYearStart, schoolYearEnd];

  if (v.registryStyle === "didup") {
    return (
      <DidupVotiPage
        studentName={(v.displayName || v.data.student.name || "ANDREA MARIA").toUpperCase()}
        subjects={didupList}
        period={didupPeriod}
        dateRange={didupRange}
        onBack={ui.openMenu}
        onPeriodChange={(period) => {
          setDidupPeriod(period);
          update({ selection: period, boundary: firstPeriodEnd });
        }}
        onOpenSubject={ui.openSubject}
      />
    );
  }

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold">Voti</h1>
        <Link
          to="/studio"
          className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-xs font-medium text-primary"
        >
          <Calculator className="h-4 w-4" /> Studio Lab
        </Link>
      </div>
      <PeriodPicker />
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        <Chip active={sort === "nome"} onClick={() => setSort("nome")}>
          A–Z
        </Chip>
        <Chip active={sort === "alta"} onClick={() => setSort("alta")}>
          Media più alta
        </Chip>
        <Chip active={sort === "bassa"} onClick={() => setSort("bassa")}>
          Media più bassa
        </Chip>
      </div>
      <SubjectMap subjects={subjects} />
      <ul className="mt-4 space-y-2">
        {list.map(({ s, st, latestGrade }) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => ui.openSubject(s.id)}
              className="press card-surface flex w-full items-center gap-3 p-4 text-left"
            >
              <SubjectMark name={s.name} color={s.color} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.name}</p>
                {s.teacher && <p className="text-[11px] text-muted-foreground">{s.teacher}</p>}
                {latestGrade?.comment && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {latestGrade.comment}
                  </p>
                )}
                <p className="tabular mb-1.5 text-[11px] text-muted-foreground">
                  {st.count} voti
                  {st.max !== null && ` · max ${fmt(st.max, 1)} · min ${fmt(st.min ?? 0, 1)}`}
                </p>
                <ProgressBar value={((st.avg ?? 0) / 10) * 100} color={s.color} />
              </div>
              <GradePill value={st.avg} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubjectMap({ subjects }: { subjects: ReturnType<typeof useSchoolPeriods>["subjects"] }) {
  const ranked = subjects
    .map((subject) => ({ subject, stats: subjectStats(subject) }))
    .filter(({ stats }) => stats.avg !== null)
    .sort((a, b) => (b.stats.avg ?? 0) - (a.stats.avg ?? 0));
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const average = overallAverage(subjects);
  return (
    <section className="card-surface mt-4 space-y-3 p-4" aria-labelledby="subject-map-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="subject-map-title" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Mappa delle materie
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Punti di forza, materie da seguire e andamento recente.
          </p>
        </div>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
          Media {average === null ? "—" : fmt(average, 2)}
        </span>
      </div>
      {ranked.length === 0 ? (
        <p className="rounded-lg bg-surface p-3 text-xs text-muted-foreground">
          Aggiungi almeno un voto per visualizzare la mappa.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-success-soft p-3">
              <p className="flex items-center gap-1 font-semibold text-success">
                <TrendingUp className="h-3.5 w-3.5" /> Punto di forza
              </p>
              <p className="mt-1 truncate text-sm font-medium">{strongest?.subject.name}</p>
              <p className="mt-0.5 text-muted-foreground">{fmt(strongest?.stats.avg ?? 0, 1)}</p>
            </div>
            <div className="rounded-lg bg-danger-soft p-3">
              <p className="flex items-center gap-1 font-semibold text-danger">
                <TrendingDown className="h-3.5 w-3.5" /> Da seguire
              </p>
              <p className="mt-1 truncate text-sm font-medium">{weakest?.subject.name}</p>
              <p className="mt-0.5 text-muted-foreground">{fmt(weakest?.stats.avg ?? 0, 1)}</p>
            </div>
          </div>
          <div className="space-y-2" aria-label="Andamento per materia">
            {ranked.map(({ subject, stats }) => (
              <div key={subject.id} className="flex items-center gap-2">
                <span className="w-24 truncate text-xs">{subject.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, Math.min(100, ((stats.avg ?? 0) / 10) * 100))}%`,
                      background: subject.color,
                    }}
                  />
                </div>
                <span className="tabular w-8 text-right text-xs font-semibold">
                  {fmt(stats.avg ?? 0, 1)}
                </span>
                <span
                  className={`w-10 text-right text-[10px] ${stats.trend === null ? "text-muted-foreground" : stats.trend >= 0 ? "text-success" : "text-danger"}`}
                >
                  {stats.trend === null
                    ? "—"
                    : `${stats.trend >= 0 ? "+" : ""}${fmt(stats.trend, 1)}`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function DidupVotiPage({
  studentName,
  subjects,
  period,
  dateRange,
  onBack,
  onPeriodChange,
  onOpenSubject,
}: {
  studentName: string;
  subjects: ReturnType<typeof useSchoolPeriods>["subjects"];
  period: PeriodSelection;
  dateRange: [string, string];
  onBack: () => void;
  onPeriodChange: (period: PeriodSelection) => void;
  onOpenSubject: (id: string) => void;
}) {
  const formatDate = (date: string) =>
    `${date.slice(8, 10)}-${date.slice(5, 7)}-${date.slice(0, 4)}`;

  return (
    <div className="didup-page min-h-dvh bg-black pb-[88px] text-white">
      <header className="flex min-h-[98px] items-center justify-between gap-3 border-b border-white/20 px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Torna al Menu"
          className="flex h-10 w-9 shrink-0 items-center justify-start text-white/90"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-normal uppercase leading-tight tracking-[0.04em]">
            Voti giornalieri
          </h1>
          <p className="mt-1 text-[12px] uppercase leading-tight text-white/90">{studentName}</p>
        </div>
        <img
          src="/didup-profile.jpg"
          alt=""
          aria-hidden="true"
          className="h-[52px] w-[52px] shrink-0 object-cover"
        />
      </header>

      <section className="border-b border-white/15 px-5 pb-5 pt-2" aria-label="Periodo scolastico">
        <h2 className="text-[12px] font-normal uppercase tracking-[0.04em] text-white/55">
          Periodo scolastico
        </h2>
        <div
          className="mt-2 grid grid-cols-3 overflow-hidden rounded-[8px] border border-white/10 bg-[#252525]"
          role="tablist"
          aria-label="Seleziona periodo"
        >
          {DIDUP_PERIODS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={period === item.value}
              onClick={() => onPeriodChange(item.value)}
              className={`min-h-[46px] px-1 text-[11px] font-normal uppercase leading-tight tracking-[0.015em] ${
                period === item.value ? "bg-[#08a5b5] text-white" : "bg-[#252525] text-white/90"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-5 text-center text-[12px] text-white/90">
          (dal {formatDate(dateRange[0])} al {formatDate(dateRange[1])})
        </p>
      </section>

      <ul className="border-b border-[#3a3a3a]">
        {subjects.map((subject) => {
          const stats = subjectStats(subject);
          const tone = gradeTone(stats.avg);
          const toneClass =
            tone === "good"
              ? "bg-[#3ed69d] text-[#14382c]"
              : tone === "ok"
                ? "bg-[#f2a93b] text-[#3d2b0d]"
                : tone === "bad"
                  ? "bg-[#ec6c62] text-[#3d1613]"
                  : "bg-[#e8e8e8] text-[#555]";
          return (
            <li key={subject.id} className="border-t border-[#3a3a3a] first:border-t-0">
              <button
                type="button"
                onClick={() => onOpenSubject(subject.id)}
                aria-label={`Apri voti ${subject.name}`}
                className="flex min-h-[90px] w-full items-center gap-4 bg-[#262626] px-[15px] py-3 text-left"
              >
                <span
                  aria-hidden="true"
                  className={`grid h-[48px] w-[48px] shrink-0 place-items-center rounded-full text-[16px] font-normal ${toneClass}`}
                >
                  {stats.avg === null ? "—" : fmt(stats.avg, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-normal uppercase leading-tight tracking-[0.01em] text-white/95">
                    {subject.name}
                  </span>
                  <span className="mt-1 block truncate text-[11px] uppercase leading-tight tracking-[0.015em] text-white/60">
                    {stats.count === 0
                      ? "Voti non presenti o disponibili"
                      : `${stats.count} voti disponibili`}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-white/75" strokeWidth={1.8} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
