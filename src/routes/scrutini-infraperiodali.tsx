import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, GraduationCap, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Empty, SectionTitle } from "@/components/voto/ui";
import { fmt } from "@/lib/voto/calc";
import {
  averageRoundedReport,
  normalizeManualReports,
  parseReportGrade,
  roundReportGrade,
  type ManualInfraperiodReport,
  type ManualReportEntry,
} from "@/lib/voto/infraperiodal";
import { buildDidupScrutinyRows, didupScrutinyAverage } from "@/lib/voto/scrutiny-report";
import { KEYS, load, save } from "@/lib/voto/storage";
import { useVoto } from "@/lib/voto/store";
import { useSchoolPeriods } from "@/lib/voto/periods-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scrutini-infraperiodali")({
  head: () => ({
    meta: [
      { title: "Scrutini infraperiodali — VOTO." },
      { name: "description", content: "Crea e compila pagelle infraperiodali manuali." },
    ],
  }),
  component: ScrutiniInfraperiodali,
});

function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function ScrutiniInfraperiodali() {
  const v = useVoto();
  const { config } = useSchoolPeriods();
  const [reports, setReports] = useState<ManualInfraperiodReport[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [subjectDraft, setSubjectDraft] = useState("");
  const [didupView, setDidupView] = useState<"landing" | "first" | "final" | "manual">("landing");

  useEffect(() => {
    if (!v.ready) return;
    const saved = normalizeManualReports(load<unknown>(KEYS.infraperiodalReports, []));
    setReports(saved);
    setActiveId(saved[0]?.id ?? null);
    setLoaded(true);
  }, [v.ready]);

  useEffect(() => {
    if (loaded) save(KEYS.infraperiodalReports, reports);
  }, [loaded, reports]);

  const activeReport = reports.find((report) => report.id === activeId) ?? null;

  function startCreate() {
    setTitleDraft(`Pagella infraperiodale ${reports.length + 1}`);
    setCreateOpen(true);
  }

  function createReport() {
    const title = titleDraft.trim();
    if (!title) return;
    const entries: ManualReportEntry[] = v.data.subjects.map((subject) => ({
      id: makeId(),
      subject: subject.name,
      rawGrade: "",
    }));
    const report: ManualInfraperiodReport = {
      id: makeId(),
      title,
      createdAt: new Date().toISOString(),
      entries,
    };
    setReports((current) => [report, ...current]);
    setActiveId(report.id);
    setCreateOpen(false);
  }

  function updateReport(
    reportId: string,
    update: (report: ManualInfraperiodReport) => ManualInfraperiodReport,
  ) {
    setReports((current) =>
      current.map((report) => (report.id === reportId ? update(report) : report)),
    );
  }

  function updateEntry(reportId: string, entryId: string, patch: Partial<ManualReportEntry>) {
    updateReport(reportId, (report) => ({
      ...report,
      entries: report.entries.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function addSubject() {
    if (!activeReport) return;
    const subject = subjectDraft.trim();
    if (!subject) return;
    const exists = activeReport.entries.some(
      (entry) =>
        entry.subject.trim().toLocaleLowerCase("it-IT") === subject.toLocaleLowerCase("it-IT"),
    );
    if (exists) return;
    updateReport(activeReport.id, (report) => ({
      ...report,
      entries: [...report.entries, { id: makeId(), subject, rawGrade: "" }],
    }));
    setSubjectDraft("");
  }

  function removeReport(report: ManualInfraperiodReport) {
    if (!window.confirm(`Vuoi eliminare “${report.title}” e i voti inseriti?`)) return;
    const next = reports.filter((item) => item.id !== report.id);
    setReports(next);
    if (activeId === report.id) setActiveId(next[0]?.id ?? null);
  }

  if (!loaded) {
    return v.registryStyle === "didup" ? (
      <div className="didup-page min-h-dvh bg-black px-2 pb-[100px] text-white">
        <DidupScrutiniHeader studentName={v.data.student.name} />
        <div className="px-2 pt-16 text-sm text-white/65">Caricamento delle pagelle…</div>
      </div>
    ) : (
      <div className="pt-3 text-sm text-muted-foreground">Caricamento delle pagelle…</div>
    );
  }

  if (v.registryStyle === "didup" && didupView === "landing") {
    return (
      <DidupScrutiniLanding
        studentName={v.data.student.name}
        onOpenFirst={() => setDidupView("first")}
        onOpenFinal={() => setDidupView("final")}
        onOpenInfraperiodal={() => setDidupView("manual")}
      />
    );
  }

  if (v.registryStyle === "didup" && (didupView === "first" || didupView === "final")) {
    const startDate = `${config.year}-09-15`;
    const firstPeriodEnd = `${config.year}-12-15`;
    const endDate = `${config.year + 1}-08-31`;
    const dateRange = didupView === "first" ? [startDate, firstPeriodEnd] : [startDate, endDate];
    const rows = buildDidupScrutinyRows(v.data.subjects, dateRange[0]!, dateRange[1]!);
    return (
      <DidupScrutinyReport
        title={didupView === "first" ? "PRIMO TRIMESTRE" : "SCRUTINIO FINALE"}
        studentName={v.data.student.name}
        rows={rows}
        average={didupScrutinyAverage(rows)}
        onBack={() => setDidupView("landing")}
      />
    );
  }

  const average = activeReport ? averageRoundedReport(activeReport.entries) : null;

  const isDidup = v.registryStyle === "didup";

  return (
    <div
      className={cn(
        "pb-6",
        isDidup ? "didup-page min-h-dvh bg-black px-2 pb-[100px] text-white" : "pt-3",
      )}
    >
      {isDidup ? (
        <DidupScrutiniHeader
          studentName={v.data.student.name}
          title="SCRUTINIO INFRAPERIODALE"
          onBack={() => setDidupView("landing")}
        />
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Scrutini infraperiodali</h1>
            <p className="text-xs text-muted-foreground">Crea e compila le tue pagelle</p>
          </div>
        </div>
      )}

      <div
        className={cn(
          "mt-4 rounded-xl border p-3 text-xs leading-relaxed",
          isDidup
            ? "border-white/15 bg-[#262626] text-white/65"
            : "border-primary/20 bg-primary-soft/50 text-muted-foreground",
        )}
      >
        Inserisci per ogni materia il voto medio, anche decimale: VOTO propone il voto intero più
        vicino (i mezzi voti si arrotondano per eccesso). Le pagelle sono manuali, salvate solo su
        questo dispositivo e non modificano i voti del registro né vengono inviate ad Argo.
      </div>

      <SectionTitle>Le tue pagelle</SectionTitle>
      <button
        type="button"
        onClick={startCreate}
        className={cn(
          "press flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold",
          isDidup ? "bg-[#3ed69d] text-[#14382c]" : "bg-primary text-primary-foreground",
        )}
      >
        <Plus className="h-4 w-4" /> Crea una pagella
      </button>

      {createOpen && (
        <form
          className={cn(
            "card-surface mt-3 p-4",
            isDidup && "border-white/15 bg-[#262626] text-white",
          )}
          onSubmit={(event) => {
            event.preventDefault();
            createReport();
          }}
        >
          <label
            htmlFor="infraperiodal-title"
            className="text-xs font-medium text-muted-foreground"
          >
            Nome della pagella
          </label>
          <input
            id="infraperiodal-title"
            autoFocus
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            maxLength={60}
            className={cn(
              "mt-2 h-11 w-full rounded-xl border px-3 text-sm",
              isDidup ? "border-white/20 bg-[#171717] text-white" : "border-input bg-background",
            )}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={!titleDraft.trim()}
              className={cn(
                "press flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50",
                isDidup ? "bg-[#3ed69d] text-[#14382c]" : "bg-primary text-primary-foreground",
              )}
            >
              <Plus className="h-4 w-4" /> Crea
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="press h-10 rounded-xl border border-border px-4 text-sm font-medium"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {reports.length === 0 ? (
        <div className="mt-4">
          <Empty
            icon={<GraduationCap className="h-6 w-6" />}
            title="Nessuna pagella creata"
            text="Crea una pagella e inserisci tu i voti da arrotondare."
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {reports.map((report) => {
            const reportAverage = averageRoundedReport(report.entries);
            return (
              <li key={report.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveId(report.id)}
                  aria-pressed={activeId === report.id}
                  className={cn(
                    "press card-surface min-w-0 flex-1 p-3 text-left",
                    isDidup && "border-white/15 bg-[#262626] text-white",
                    activeId === report.id &&
                      (isDidup ? "border-[#3ed69d]" : "border-primary/60 bg-primary-soft/40"),
                  )}
                >
                  <span className="block truncate text-sm font-semibold">{report.title}</span>
                  <span
                    className={cn(
                      "mt-1 block text-[11px]",
                      isDidup ? "text-white/55" : "text-muted-foreground",
                    )}
                  >
                    {
                      report.entries.filter((entry) => parseReportGrade(entry.rawGrade) !== null)
                        .length
                    }{" "}
                    materie compilate
                    {reportAverage !== null && ` · media arrotondata ${fmt(reportAverage, 1)}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeReport(report)}
                  aria-label={`Elimina ${report.title}`}
                  className="press rounded-xl border border-border p-3 text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {activeReport && (
        <section className="mt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="active-report-title"
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  isDidup ? "text-white/55" : "text-muted-foreground",
                )}
              >
                Titolo
              </label>
              <input
                id="active-report-title"
                value={activeReport.title}
                onChange={(event) =>
                  updateReport(activeReport.id, (report) => ({
                    ...report,
                    title: event.target.value,
                  }))
                }
                maxLength={60}
                className={cn(
                  "mt-1 h-10 w-full rounded-xl border px-3 text-sm font-semibold",
                  isDidup
                    ? "border-white/20 bg-[#171717] text-white"
                    : "border-input bg-background",
                )}
              />
            </div>
            <div
              className={cn(
                "rounded-xl px-3 py-2 text-right",
                isDidup ? "bg-[#262626]" : "bg-surface",
              )}
            >
              <span
                className={cn(
                  "block text-[9px] font-semibold uppercase",
                  isDidup ? "text-white/55" : "text-muted-foreground",
                )}
              >
                Media pagella
              </span>
              <span className={cn("tabular text-lg font-bold", isDidup && "text-[#3ed69d]")}>
                {average === null ? "—" : fmt(average, 1)}
              </span>
            </div>
          </div>

          <SectionTitle>Voti per materia</SectionTitle>
          {activeReport.entries.length === 0 ? (
            <Empty
              icon={<GraduationCap className="h-6 w-6" />}
              title="Aggiungi una materia"
              text="Puoi inserirla manualmente qui sotto."
            />
          ) : (
            <ul className={cn("space-y-2", isDidup && "divide-y divide-[#3a3a3a]")}>
              {activeReport.entries.map((entry) => {
                const parsed = parseReportGrade(entry.rawGrade);
                const rounded = roundReportGrade(parsed);
                const invalid = entry.rawGrade.trim() !== "" && parsed === null;
                return (
                  <li
                    key={entry.id}
                    className={cn(
                      "card-surface flex items-center gap-3 p-3",
                      isDidup && "rounded-none border-0 bg-black px-1 py-4",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          isDidup && "font-extrabold uppercase text-white",
                        )}
                      >
                        {entry.subject}
                      </p>
                      {invalid && (
                        <p className="mt-0.5 text-[10px] text-danger">
                          Inserisci un voto da 1 a 10.
                        </p>
                      )}
                    </div>
                    <label className="sr-only" htmlFor={`grade-${entry.id}`}>
                      Media di {entry.subject}
                    </label>
                    <input
                      id={`grade-${entry.id}`}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="Es. 6,5"
                      value={entry.rawGrade}
                      onChange={(event) =>
                        updateEntry(activeReport.id, entry.id, { rawGrade: event.target.value })
                      }
                      className={cn(
                        "h-10 w-[5.5rem] rounded-xl border px-2 text-center text-sm tabular-nums",
                        isDidup
                          ? "border-white/20 bg-[#171717] text-white"
                          : "border-input bg-background",
                      )}
                    />
                    <span
                      className={cn(
                        "w-[4.5rem] rounded-lg px-2 py-2 text-center text-xs font-semibold",
                        rounded === null
                          ? isDidup
                            ? "bg-[#262626] text-white/50"
                            : "bg-surface text-muted-foreground"
                          : isDidup
                            ? "bg-[#262626] text-[#3ed69d]"
                            : "bg-primary-soft text-primary",
                      )}
                    >
                      {rounded === null ? "—" : `Voto ${rounded}`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateReport(activeReport.id, (report) => ({
                          ...report,
                          entries: report.entries.filter((item) => item.id !== entry.id),
                        }))
                      }
                      aria-label={`Rimuovi ${entry.subject}`}
                      className="press rounded-lg p-1.5 text-muted-foreground hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addSubject();
            }}
          >
            <label htmlFor="add-report-subject" className="sr-only">
              Nuova materia
            </label>
            <input
              id="add-report-subject"
              value={subjectDraft}
              onChange={(event) => setSubjectDraft(event.target.value)}
              maxLength={60}
              placeholder="Aggiungi una materia"
              className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <button
              type="submit"
              disabled={!subjectDraft.trim()}
              className="press flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Aggiungi
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function DidupScrutiniHeader({
  studentName,
  title = "VOTI SCRUTINI",
  onBack,
}: {
  studentName?: string | undefined;
  title?: string;
  onBack?: () => void;
}) {
  return (
    <header className="flex min-h-[98px] items-center justify-between gap-3 border-b border-white/20 bg-[#071313] px-2 py-4">
      <div className="flex min-w-0 items-start">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Torna agli scrutini"
            className="press flex h-10 w-10 shrink-0 items-center justify-start text-white"
          >
            <ArrowLeft className="h-8 w-8" strokeWidth={1.7} />
          </button>
        ) : (
          <Link
            to="/"
            aria-label="Torna alla Home"
            className="press flex h-10 w-10 shrink-0 items-center justify-start text-white"
          >
            <ArrowLeft className="h-8 w-8" strokeWidth={1.7} />
          </Link>
        )}
        <div className="ml-4 pt-0.5">
          <h1 className="text-[17px] font-normal leading-5">{title}</h1>
          <p className="mt-1 text-[12px] leading-4">
            {(studentName || "ANDREA MARIA").toUpperCase()}
          </p>
        </div>
      </div>
      <img src="/didup-profile.jpg" alt="" className="h-[50px] w-[50px] shrink-0 object-cover" />
    </header>
  );
}

function DidupScrutiniLanding({
  studentName,
  onOpenFirst,
  onOpenFinal,
  onOpenInfraperiodal,
}: {
  studentName?: string | undefined;
  onOpenFirst: () => void;
  onOpenFinal: () => void;
  onOpenInfraperiodal: () => void;
}) {
  return (
    <div className="didup-page min-h-dvh bg-black px-2 pb-[100px] text-white">
      <DidupScrutiniHeader studentName={studentName} />
      <div className="mt-[78px] px-1">
        <DidupScrutiniRow label="PRIMO TRIMESTRE" onClick={onOpenFirst} />
        <DidupScrutiniRow label="SCRUTINIO FINALE" onClick={onOpenFinal} />
        <DidupScrutiniRow label="SCRUTINIO INFRAPERIODALE" onClick={onOpenInfraperiodal} last />
      </div>
    </div>
  );
}

function DidupScrutinyReport({
  title,
  studentName,
  rows,
  average,
  onBack,
}: {
  title: string;
  studentName?: string | undefined;
  rows: ReturnType<typeof buildDidupScrutinyRows>;
  average: number | null;
  onBack: () => void;
}) {
  return (
    <div className="didup-page min-h-dvh bg-black pb-[100px] text-white">
      <DidupScrutiniHeader studentName={studentName} title={title} onBack={onBack} />
      <section className="mx-2 mt-6 rounded-[14px] border border-[#3ed69d]/45 bg-[#18382d] px-4 py-3">
        <p className="text-[14px] font-extrabold uppercase tracking-wide text-[#3ed69d]">
          Previsione automatica
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/70">
          VOTO calcola il voto previsto usando la media dei voti registrati nel periodo selezionato.
          La previsione non modifica i dati e non è il voto ufficiale dello scrutinio.
        </p>
      </section>
      <ul className="mt-7 border-b border-[#3a3a3a] px-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex min-h-[92px] items-center gap-3 border-t border-[#3a3a3a] py-3 first:border-t-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-extrabold uppercase leading-tight text-white">
                {row.name}
              </p>
              <p className="mt-1 text-[13px] uppercase text-white/90">
                VOTI REGISTRATI: {row.gradeCount}
              </p>
            </div>
            <span className="w-[62px] shrink-0 text-[10px] uppercase leading-tight text-white/45">
              VOTO
              <br />
              previsto
            </span>
            <span className="w-[42px] shrink-0 text-center text-[20px] font-bold text-[#3ed69d]">
              {row.grade === null ? "—" : row.grade}
            </span>
          </li>
        ))}
      </ul>
      <section className="mx-2 mt-7 rounded-[14px] border-[3px] border-[#3ed69d] bg-[#262626] px-4 py-4">
        <h2 className="text-[17px] font-medium uppercase tracking-wide text-[#3ed69d]">
          Riepilogo della previsione
        </h2>
        <p className="mt-3 text-[14px] uppercase text-[#7189aa]">
          Media: {average === null ? "—" : fmt(average, 2)}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/50">
          Calcolata dai voti registrati nel periodo; non è una valutazione ufficiale dello
          scrutinio.
        </p>
      </section>
    </div>
  );
}

function DidupScrutiniRow({
  label,
  onClick,
  last = false,
}: {
  label: string;
  onClick?: () => void;
  last?: boolean;
}) {
  const content = (
    <>
      <span className="text-[17px] font-extrabold tracking-tight">{label}</span>
      <ChevronRight className="h-7 w-7 shrink-0" strokeWidth={1.7} />
    </>
  );

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press flex min-h-[96px] w-full items-center justify-between px-7 text-left",
        !last && "border-b border-white/25",
      )}
    >
      {content}
    </button>
  ) : (
    <div
      className={cn(
        "flex min-h-[96px] items-center justify-between px-7",
        !last && "border-b border-white/25",
      )}
    >
      {content}
    </div>
  );
}
