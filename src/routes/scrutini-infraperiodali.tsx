import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Plus, Trash2, X } from "lucide-react";
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
import { KEYS, load, save } from "@/lib/voto/storage";
import { useVoto } from "@/lib/voto/store";
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
  const [reports, setReports] = useState<ManualInfraperiodReport[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [subjectDraft, setSubjectDraft] = useState("");

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
    return <div className="pt-3 text-sm text-muted-foreground">Caricamento delle pagelle…</div>;
  }

  const average = activeReport ? averageRoundedReport(activeReport.entries) : null;

  return (
    <div className="pt-3 pb-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Scrutini infraperiodali</h1>
          <p className="text-xs text-muted-foreground">Crea e compila le tue pagelle</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-primary/20 bg-primary-soft/50 p-3 text-xs leading-relaxed text-muted-foreground">
        Inserisci per ogni materia il voto medio, anche decimale: VOTO propone il voto intero più
        vicino (i mezzi voti si arrotondano per eccesso). Le pagelle sono manuali, salvate solo su
        questo dispositivo e non modificano i voti del registro né vengono inviate ad Argo.
      </div>

      <SectionTitle>Le tue pagelle</SectionTitle>
      <button
        type="button"
        onClick={startCreate}
        className="press flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
      >
        <Plus className="h-4 w-4" /> Crea una pagella
      </button>

      {createOpen && (
        <form
          className="card-surface mt-3 p-4"
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
            className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={!titleDraft.trim()}
              className="press flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
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
                    activeId === report.id && "border-primary/60 bg-primary-soft/40",
                  )}
                >
                  <span className="block truncate text-sm font-semibold">{report.title}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
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
                className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
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
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold"
              />
            </div>
            <div className="rounded-xl bg-surface px-3 py-2 text-right">
              <span className="block text-[9px] font-semibold uppercase text-muted-foreground">
                Media pagella
              </span>
              <span className="tabular text-lg font-bold">
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
            <ul className="space-y-2">
              {activeReport.entries.map((entry) => {
                const parsed = parseReportGrade(entry.rawGrade);
                const rounded = roundReportGrade(parsed);
                const invalid = entry.rawGrade.trim() !== "" && parsed === null;
                return (
                  <li key={entry.id} className="card-surface flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.subject}</p>
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
                      className="h-10 w-[5.5rem] rounded-xl border border-input bg-background px-2 text-center text-sm tabular-nums"
                    />
                    <span
                      className={cn(
                        "w-[4.5rem] rounded-lg px-2 py-2 text-center text-xs font-semibold",
                        rounded === null
                          ? "bg-surface text-muted-foreground"
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
