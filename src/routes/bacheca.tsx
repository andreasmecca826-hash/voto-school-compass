import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CircularViewer } from "@/components/voto/CircularViewer";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, toIso } from "@/lib/voto/dates";
import { notificationContentLabel, notificationDisplayTitle } from "@/lib/voto/selectors";
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

function displayFilterDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}-${month}-${year}` : "";
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
      <header className="flex items-center gap-[42px] pl-4 pr-[17px] pb-[44px] pt-[21px]">
        <Link
          to="/"
          aria-label="Torna alla home"
          className="press flex h-10 w-8 shrink-0 items-center justify-start text-white"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={1.7} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-normal leading-none tracking-tight">BACHECA</h1>
          <p className="mt-[2px] truncate text-[14px] leading-none text-white/85">{studentName}</p>
        </div>
        <img
          src="/didup-profile.jpg"
          alt=""
          aria-hidden="true"
          className="-translate-y-[4px] h-[62px] w-[62px] shrink-0 object-cover"
        />
      </header>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            top: "calc(50% + 5px)",
          }}
          className="flex max-h-[78dvh] w-[min(73vw,350px)] max-w-[350px] flex-col items-stretch gap-0 overflow-y-auto rounded-[11px] border-0 bg-[#292929] px-6 pb-[19px] pt-[40px] text-white shadow-xl sm:rounded-[11px] [&>button]:right-4 [&>button]:top-4 [&>button]:h-9 [&>button]:w-9 [&>button]:opacity-100 [&>button>svg]:h-5 [&>button>svg]:w-5"
        >
          <DialogTitle className="text-left text-[18px] font-normal tracking-wide text-white">
            FILTRA
          </DialogTitle>
          <DialogDescription className="sr-only">
            Filtra le circolari per testo e intervallo di date.
          </DialogDescription>

          <div className="-ml-6 mt-[46px] flex items-center gap-[18px]">
            <Search
              className="-ml-[3px] h-[68px] w-[68px] shrink-0 text-white"
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
              className="h-[60px] min-w-0 flex-1 rounded-[10px] border border-white bg-[#333638] px-5 text-[18px] text-white outline-none placeholder:text-white/65 focus:border-[#0aa0b1]"
            />
          </div>

          <div className="-ml-[9px] mt-[48px] grid grid-cols-[26px_minmax(0,1fr)] items-center gap-x-[41px] gap-y-[52px]">
            <label htmlFor="bacheca-date-from" className="text-right text-[18px] text-white">
              Dal:
            </label>
            <div className="relative mr-[1px] h-[60px] min-w-0 rounded-[10px] border border-white bg-[#333638] focus-within:border-[#0aa0b1]">
              <input
                id="bacheca-date-from"
                type="date"
                value={draftFilters.from}
                onChange={(event) => {
                  setDraftFilters((current) => ({ ...current, from: event.target.value }));
                  setFilterError("");
                }}
                aria-label="Data iniziale"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-5 right-12 top-1/2 -translate-y-1/2 truncate text-[19px] text-white"
              >
                {displayFilterDate(draftFilters.from)}
              </span>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                <img
                  src="/didup-icons/calendar.png"
                  alt=""
                  aria-hidden="true"
                  className="h-[38px] w-[40px] object-contain"
                />
              </span>
            </div>
            <label htmlFor="bacheca-date-to" className="text-right text-[18px] text-white">
              Al:
            </label>
            <div className="relative mr-[1px] h-[60px] min-w-0 rounded-[10px] border border-white bg-[#333638] focus-within:border-[#0aa0b1]">
              <input
                id="bacheca-date-to"
                type="date"
                value={draftFilters.to}
                onChange={(event) => {
                  setDraftFilters((current) => ({ ...current, to: event.target.value }));
                  setFilterError("");
                }}
                aria-label="Data finale"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-5 right-12 top-1/2 -translate-y-1/2 truncate text-[19px] text-white"
              >
                {displayFilterDate(draftFilters.to)}
              </span>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                <img
                  src="/didup-icons/calendar.png"
                  alt=""
                  aria-hidden="true"
                  className="h-[38px] w-[40px] object-contain"
                />
              </span>
            </div>
          </div>

          {filterError && <p className="mt-3 text-center text-xs text-red-300">{filterError}</p>}

          <button
            type="button"
            onClick={applyFilters}
            className="press mt-[38px] h-[50px] self-center rounded-[13px] bg-[#00a6b7] text-[16px] font-medium tracking-wide text-white"
            style={{
              width: "min(238px, 100%)",
              height: "50px",
              alignSelf: "center",
              flexShrink: 0,
            }}
          >
            APPLICA
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="press mt-[27px] min-h-10 w-full whitespace-nowrap text-[17px] tracking-wide text-white/85"
            style={{ width: "100%", textAlign: "center", alignSelf: "stretch" }}
          >
            AZZERA FILTRO
          </button>
        </DialogContent>
      </Dialog>

      <main className="px-[19px]">
        {filtered.length ? (
          filtered.map((item) => {
            const count = attachmentCount(item);
            const contentLabel = notificationContentLabel(item);
            return (
              <article
                key={item.id}
                className="didup-tile mb-[19px] flex min-h-[278px] flex-col rounded-[10px] px-[19px] pb-5 pt-[27px]"
              >
                <div className="relative h-[42px]">
                  <img
                    src="/didup-icons/person.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute -left-[2px] top-[2px] h-[20px] w-[21px] object-contain"
                  />
                  <p className="absolute left-[28px] right-0 top-[1px] truncate text-[18px] font-semibold leading-5 uppercase">
                    {item.teacher || "SCUOLA"}
                  </p>
                  <time
                    dateTime={item.date}
                    className="absolute -left-[1px] top-[28px] whitespace-nowrap text-[16px] font-medium leading-4 text-[#0aa0b1]"
                  >
                    {shortDate(item.date)}
                  </time>
                </div>

                <div className="-ml-[2px] mt-[30px] flex items-center gap-[12px]">
                  <img
                    src="/didup-icons/folder.png"
                    alt=""
                    aria-hidden="true"
                    className="h-[29px] w-[32px] shrink-0 object-contain"
                  />
                  <span className="text-[16px] tracking-[0.08em]">
                    {contentLabel.toLocaleUpperCase("it-IT")}
                  </span>
                </div>

                <p className="mt-6 break-words text-[18px] leading-[1.4] text-white/95">
                  {item.message && item.message !== item.title
                    ? item.message
                    : notificationDisplayTitle(item)}
                </p>

                {count > 0 && (
                  <button
                    type="button"
                    onClick={() => openNotice(item, v.markRead, setSelected)}
                    aria-label={`Apri circolare con ${count} ${count === 1 ? "allegato" : "allegati"}`}
                    className="press mt-auto inline-flex min-h-10 items-center gap-[9px] pt-5 text-left text-[14px] text-white/90"
                  >
                    <img
                      src="/didup-icons/file.png"
                      alt=""
                      aria-hidden="true"
                      className="h-[26px] w-[21px] shrink-0 object-contain"
                    />
                    <span>{count}</span>
                  </button>
                )}
                {count === 0 && (item.message || item.extractedText || item.title) && (
                  <button
                    type="button"
                    onClick={() => openNotice(item, v.markRead, setSelected)}
                    className="press mt-auto inline-flex min-h-10 items-center gap-[9px] pt-5 text-left text-[14px] text-white/90"
                  >
                    <FileText className="h-[21px] w-[21px] shrink-0" aria-hidden="true" />
                    <span>Apri comunicazione</span>
                  </button>
                )}
              </article>
            );
          })
        ) : (
          <div className="mx-1 mt-6 rounded-[14px] bg-[#292929] px-5 py-10 text-center">
            <img
              src="/didup-icons/folder.png"
              alt=""
              aria-hidden="true"
              className="mx-auto h-8 w-8 object-contain"
            />
            <p className="mt-4 text-sm text-white/90">
              {hasActiveFilters
                ? "Nessuna circolare o comunicazione corrisponde ai filtri scelti."
                : "Nessuna circolare o comunicazione in bacheca."}
            </p>
          </div>
        )}
      </main>

      <button
        type="button"
        onClick={openFilter}
        aria-label="Filtra la bacheca"
        aria-expanded={filterOpen}
        className="press fixed bottom-[120px] z-30 flex h-[70px] w-[70px] items-center justify-center rounded-[18px] bg-[#0aa0b1] text-white shadow-lg"
        style={{ right: "max(20px, calc((100vw - 480px) / 2 + 20px))" }}
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
        extractedText={selected?.extractedText ?? selected?.message ?? selected?.title}
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
          const contentLabel = notificationContentLabel(item);
          return (
            <article key={item.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">
                    {contentLabel}
                    {item.subject ? ` · ${item.subject}` : ""}
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
              {count === 0 && (item.message || item.extractedText || item.title) && (
                <button
                  type="button"
                  onClick={() => openNotice(item, v.markRead, setSelected)}
                  className="press mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary"
                >
                  <FileText className="h-4 w-4" />
                  Apri comunicazione
                </button>
              )}
            </article>
          );
        })
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nessuna circolare o comunicazione in bacheca.
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
        extractedText={selected?.extractedText ?? selected?.message ?? selected?.title}
      />
    </div>
  );
}
