import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Folder, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { CircularViewer } from "@/components/voto/CircularViewer";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, toIso } from "@/lib/voto/dates";
import { useVoto } from "@/lib/voto/store";
import type { AppNotification } from "@/lib/voto/types";

export const Route = createFileRoute("/bacheca")({
  head: () => ({
    meta: [
      { title: "Bacheca — VOTO." },
      { name: "description", content: "Circolari e avvisi della scuola." },
      { property: "og:title", content: "Bacheca — VOTO." },
      { property: "og:description", content: "Circolari e avvisi della scuola." },
    ],
  }),
  component: Bacheca,
});

function Bacheca() {
  const v = useVoto();
  return v.registryStyle === "didup" ? <DidupBacheca /> : <StandardBacheca />;
}

function getNotices(notifications: AppNotification[]) {
  return notifications
    .filter((item) => item.type === "notice")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

function shortDate(value?: string) {
  if (!value) return "DATA NON DISPONIBILE";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "DATA NON DISPONIBILE";
  return fmtDate(value, { day: "2-digit", month: "short", year: "2-digit" })
    .replace(/[.]/g, "")
    .toLocaleUpperCase("it-IT");
}

function attachmentCount(item: AppNotification) {
  if (item.attachments?.length) return item.attachments.length;
  return item.attachmentPath || item.attachmentUrl ? 1 : 0;
}

function openNotice(
  item: AppNotification,
  markRead: (ids: string[]) => void,
  setSelected: (item: AppNotification) => void,
) {
  setSelected(item);
  markRead([item.id]);
}

type BachecaFilters = { query: string; from: string; to: string };

function schoolYearStart(date: Date) {
  const year = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}-09-01`;
}

function DidupBacheca() {
  const v = useVoto();
  const today = new Date();
  const defaultFilters = {
    query: "",
    from: schoolYearStart(today),
    to: toIso(today),
  };
  const [filters, setFilters] = useState<BachecaFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<BachecaFilters>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterError, setFilterError] = useState("");
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const notices = useMemo(() => getNotices(v.data.notifications), [v.data.notifications]);
  const filtered = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase("it-IT");
    return notices.filter((item) => {
      if (
        query &&
        ![item.title, item.message, item.teacher, item.subject]
          .filter(Boolean)
          .some((field) => field!.toLocaleLowerCase("it-IT").includes(query))
      ) {
        return false;
      }
      const date = item.date?.slice(0, 10) ?? "";
      if (filters.from && (!date || date < filters.from)) return false;
      if (filters.to && (!date || date > filters.to)) return false;
      return true;
    });
  }, [notices, filters]);
  const hasActiveFilters = Boolean(filters.query || filters.from || filters.to);
  const openFilter = () => {
    setDraftFilters(filters);
    setFilterError("");
    setFilterOpen(true);
  };
  const applyFilters = () => {
    if (draftFilters.from && draftFilters.to && draftFilters.from > draftFilters.to) {
      setFilterError("La data iniziale deve precedere quella finale.");
      return;
    }
    setFilters(draftFilters);
    setFilterOpen(false);
  };
  const clearFilters = () => {
    const cleared = { query: "", from: "", to: "" };
    setFilters(cleared);
    setDraftFilters(cleared);
    setFilterError("");
    setFilterOpen(false);
  };
  const studentName = (v.data.student.name || "STUDENTE").toLocaleUpperCase("it-IT");

  return (
    <div className="didup-page min-h-dvh bg-black pb-[112px] text-white">
      <header className="flex items-center gap-4 px-4 pb-7 pt-5">
        <Link
          to="/"
          aria-label="Torna alla home"
          className="press flex h-10 w-8 shrink-0 items-center justify-start text-white"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={1.7} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-normal leading-none tracking-tight">BACHECA</h1>
          <p className="mt-2 truncate text-[14px] leading-none text-white/85">{studentName}</p>
        </div>
        <img
          src="/didup-profile.jpg"
          alt=""
          aria-hidden="true"
          className="h-[50px] w-[50px] shrink-0 object-cover"
        />
      </header>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="w-[min(78vw,380px)] max-w-[380px] gap-0 overflow-y-auto rounded-[14px] border-0 bg-[#292929] px-5 pb-5 pt-8 text-white shadow-xl sm:rounded-[14px] [&>button]:right-4 [&>button]:top-4 [&>button]:h-9 [&>button]:w-9 [&>button]:opacity-100 [&>button>svg]:h-7 [&>button>svg]:w-7">
          <DialogTitle className="text-left text-[16px] font-normal tracking-wide text-white">
            FILTRA
          </DialogTitle>
          <DialogDescription className="sr-only">
            Filtra le circolari per testo e intervallo di date.
          </DialogDescription>

          <div className="mt-7 flex items-center gap-4">
            <Search
              className="h-[58px] w-[58px] shrink-0 text-white"
              strokeWidth={2.5}
              aria-hidden="true"
            />
            <input
              value={draftFilters.query}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, query: event.target.value }))
              }
              placeholder="Cerca..."
              aria-label="Cerca circolari"
              className="h-[46px] min-w-0 flex-1 rounded-[11px] border border-white bg-[#333638] px-3 text-[15px] text-white outline-none placeholder:text-white/65 focus:border-[#0aa0b1]"
            />
          </div>

          <div className="mt-9 grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-5">
            <label htmlFor="bacheca-date-from" className="text-[15px] text-white">
              Dal:
            </label>
            <input
              id="bacheca-date-from"
              type="date"
              value={draftFilters.from}
              onChange={(event) => {
                setDraftFilters((current) => ({ ...current, from: event.target.value }));
                setFilterError("");
              }}
              aria-label="Data iniziale"
              className="h-[46px] min-w-0 w-full rounded-[11px] border border-white bg-[#333638] px-3 text-[15px] text-white outline-none [color-scheme:dark] focus:border-[#0aa0b1]"
            />
            <label htmlFor="bacheca-date-to" className="text-[15px] text-white">
              Al:
            </label>
            <input
              id="bacheca-date-to"
              type="date"
              value={draftFilters.to}
              onChange={(event) => {
                setDraftFilters((current) => ({ ...current, to: event.target.value }));
                setFilterError("");
              }}
              aria-label="Data finale"
              className="h-[46px] min-w-0 w-full rounded-[11px] border border-white bg-[#333638] px-3 text-[15px] text-white outline-none [color-scheme:dark] focus:border-[#0aa0b1]"
            />
          </div>

          {filterError && <p className="mt-3 text-center text-xs text-red-300">{filterError}</p>}

          <button
            type="button"
            onClick={applyFilters}
            className="press mt-7 h-[48px] w-full rounded-[13px] bg-[#00a6b7] text-[14px] font-medium tracking-wide text-white"
          >
            APPLICA
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="press mt-5 min-h-10 w-full text-[14px] tracking-wide text-white/85"
          >
            AZZERA FILTRO
          </button>
        </DialogContent>
      </Dialog>

      <main className="px-3">
        {filtered.length ? (
          filtered.map((item) => {
            const count = attachmentCount(item);
            return (
              <article
                key={item.id}
                className="didup-tile mb-4 flex min-h-[250px] flex-col px-5 pb-5 pt-6"
                style={{ borderRadius: 14 }}
              >
                <div className="flex items-center gap-3">
                  <UserRound
                    className="h-[29px] w-[29px] shrink-0 fill-[#3e6695] text-[#3e6695]"
                    strokeWidth={1.2}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold leading-5 uppercase">
                      {item.teacher || "SCUOLA"}
                    </p>
                    <time
                      dateTime={item.date}
                      className="mt-1 block text-[13px] font-medium leading-4 text-[#0aa0b1]"
                    >
                      {shortDate(item.date)}
                    </time>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <Folder
                    className="h-8 w-8 shrink-0 fill-[#0aa0b1] text-[#0aa0b1]"
                    strokeWidth={1.2}
                    aria-hidden="true"
                  />
                  <span className="text-[15px] tracking-[0.08em]">CIRCOLARI</span>
                </div>

                <p className="mt-7 break-words text-[16px] leading-[1.45] text-white/95">
                  {item.message || item.title}
                </p>

                {count > 0 && (
                  <button
                    type="button"
                    onClick={() => openNotice(item, v.markRead, setSelected)}
                    aria-label={`Apri circolare con ${count} ${count === 1 ? "allegato" : "allegati"}`}
                    className="press mt-auto inline-flex min-h-10 items-center gap-3 pt-5 text-left text-[14px] text-white/90"
                  >
                    <FileText className="h-8 w-7 shrink-0" strokeWidth={1.4} aria-hidden="true" />
                    <span>{count}</span>
                  </button>
                )}
              </article>
            );
          })
        ) : (
          <div className="mx-1 mt-6 rounded-[14px] bg-[#292929] px-5 py-10 text-center">
            <Folder className="mx-auto h-8 w-8 text-[#0aa0b1]" aria-hidden="true" />
            <p className="mt-4 text-sm text-white/90">
              {hasActiveFilters
                ? "Nessuna circolare corrisponde ai filtri scelti."
                : "Nessuna circolare in bacheca."}
            </p>
          </div>
        )}
      </main>

      <button
        type="button"
        onClick={openFilter}
        aria-label="Filtra la bacheca"
        aria-expanded={filterOpen}
        className="press fixed bottom-[180px] z-30 flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[#0aa0b1] text-white shadow-lg"
        style={{ right: "max(16px, calc((100vw - 480px) / 2 + 16px))" }}
      >
        <Search className="h-7 w-7" />
      </button>

      <CircularViewer
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.message ?? selected?.title ?? "Circolare"}
        fileName={selected?.attachmentName}
        path={selected?.attachmentPath}
        attachments={selected?.attachments}
        url={selected?.attachmentUrl}
      />
    </div>
  );
}

function StandardBacheca() {
  const v = useVoto();
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const notices = useMemo(() => getNotices(v.data.notifications), [v.data.notifications]);

  return (
    <div className="space-y-3 pt-3">
      <h1 className="font-display text-2xl font-semibold">Bacheca</h1>
      {notices.length ? (
        notices.map((item) => {
          const count = attachmentCount(item);
          return (
            <article key={item.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">
                    {item.subject || "Circolari"}
                    {item.teacher ? ` · ${item.teacher}` : ""}
                  </p>
                  <h2 className="mt-1 text-sm font-semibold">{item.message || item.title}</h2>
                </div>
                {item.date && (
                  <time className="shrink-0 text-[11px] text-muted-foreground">
                    {shortDate(item.date)}
                  </time>
                )}
              </div>
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => openNotice(item, v.markRead, setSelected)}
                  className="press mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary"
                >
                  <FileText className="h-4 w-4" />
                  {count} {count === 1 ? "allegato" : "allegati"}
                </button>
              )}
            </article>
          );
        })
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nessuna circolare in bacheca.
        </p>
      )}
      <CircularViewer
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.message ?? selected?.title ?? "Circolare"}
        fileName={selected?.attachmentName}
        path={selected?.attachmentPath}
        attachments={selected?.attachments}
        url={selected?.attachmentUrl}
      />
    </div>
  );
}
