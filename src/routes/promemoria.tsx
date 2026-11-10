import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, Check, ChevronDown, Clock3 } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Empty } from "@/components/voto/ui";
import { fmtDate } from "@/lib/voto/dates";
import { selectPastReminders, selectUpcomingReminders } from "@/lib/voto/selectors";
import { useClock, useVoto } from "@/lib/voto/store";
import { reminderDateToIso } from "@/lib/voto/interrogazioni";

export const Route = createFileRoute("/promemoria")({
  head: () => ({
    meta: [
      { title: "Promemoria — VOTO." },
      { name: "description", content: "Promemoria sincronizzati dal registro DidUP." },
    ],
  }),
  component: Promemoria,
});

function Promemoria() {
  const v = useVoto();
  return v.registryStyle === "didup" ? <DidupPromemoria /> : <StandardPromemoria />;
}

function reminderDate(value?: string) {
  if (!value) return "DATA NON DISPONIBILE";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "DATA NON DISPONIBILE";
  return fmtDate(value, { day: "2-digit", month: "short", year: "2-digit" })
    .replace(/[.]/g, "")
    .toLocaleUpperCase("it-IT");
}

function DidupPromemoria() {
  const v = useVoto();
  const now = useClock();
  const upcoming = useMemo(
    () => selectUpcomingReminders(v.data.notifications, now),
    [now, v.data.notifications],
  );
  const past = useMemo(
    () => [...selectPastReminders(v.data.notifications, now, 30)].reverse(),
    [now, v.data.notifications],
  );
  const [showPast, setShowPast] = useState(true);
  const studentName = (v.data.student.name || "STUDENTE").toLocaleUpperCase("it-IT");
  const renderReminder = (reminder: (typeof upcoming)[number]) => (
    <li
      key={reminder.id}
      className="min-h-[162px] border-b border-[#414141] bg-[#262729] px-[26px] pb-[18px] pt-[26px] last:border-b-0"
    >
      <div className="relative h-[44px]">
        <img
          src="/didup-icons/person.png"
          alt=""
          aria-hidden="true"
          className="absolute left-0 top-[2px] h-[20px] w-[21px] object-contain"
        />
        <p className="absolute left-[28px] right-0 top-[1px] truncate text-[18px] font-semibold leading-5 uppercase">
          {reminder.teacher || reminder.subject || "SCUOLA"}
        </p>
        <time
          dateTime={reminder.date}
          className="absolute left-0 top-[25px] whitespace-nowrap text-[15px] font-medium leading-4 text-[#0aa0b1]"
        >
          {reminderDate(reminder.date)}
        </time>
      </div>
      <p className="mt-[32px] whitespace-pre-line break-words text-[18px] leading-[1.4] text-white/90">
        {reminder.message?.trim() || reminder.title}
      </p>
    </li>
  );

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
          <h1 className="text-[24px] font-normal leading-none tracking-tight">PROMEMORIA</h1>
          <p className="mt-[2px] truncate text-[14px] leading-none text-white/85">{studentName}</p>
        </div>
        <img
          src="/didup-profile.jpg"
          alt=""
          aria-hidden="true"
          className="-translate-y-[4px] h-[62px] w-[62px] shrink-0 object-cover"
        />
      </header>

      {upcoming.length > 0 ? (
        <ul aria-label="Promemoria futuri">{upcoming.map(renderReminder)}</ul>
      ) : (
        <p className="bg-[#262729] px-[39px] py-9 text-[17px] text-white/80">
          Nessun promemoria futuro.
        </p>
      )}

      <div className="flex min-h-[59px] items-center justify-between gap-4 bg-black px-[26px]">
        <span className="text-[16px] italic tracking-wide text-white/90">
          Mostra promemoria precedenti
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={showPast}
          aria-label="Mostra promemoria precedenti"
          onClick={() => setShowPast((current) => !current)}
          className={`press relative h-[30px] w-[51px] shrink-0 rounded-full transition-colors ${
            showPast ? "bg-[#0aa0b1]" : "bg-[#55585a]"
          }`}
        >
          <span
            className={`absolute top-[3px] h-[24px] w-[24px] rounded-full bg-white shadow-sm transition-[left] ${
              showPast ? "left-[24px]" : "left-[3px]"
            }`}
          />
        </button>
      </div>

      {showPast &&
        (past.length > 0 ? (
          <ul aria-label="Promemoria precedenti">{past.map(renderReminder)}</ul>
        ) : (
          <p className="border-t border-[#414141] bg-[#262729] px-[26px] py-5 text-[15px] text-white/75">
            Nessun promemoria precedente negli ultimi 30 giorni.
          </p>
        ))}
    </div>
  );
}

function StandardPromemoria() {
  const v = useVoto();
  const now = useClock();
  const upcoming = useMemo(
    () => selectUpcomingReminders(v.data.notifications, now),
    [now, v.data.notifications],
  );
  const past = useMemo(
    () => selectPastReminders(v.data.notifications, now, 30),
    [now, v.data.notifications],
  );
  const renderReminder = (reminder: (typeof upcoming)[number]) => {
    const read = v.isRead(reminder.id, reminder.read);
    const message =
      reminder.message?.trim() && reminder.message.trim() !== reminder.title.trim()
        ? reminder.message.trim()
        : "";
    const addedToVerifications = v.interrogazioni.some((item) => item.reminderId === reminder.id);
    return (
      <li key={reminder.id} className={`card-surface p-4 ${!read ? "border-primary/30" : ""}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Clock3 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{reminder.title}</h2>
              {!read && (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Nuovo
                </span>
              )}
            </div>
            {message ? (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {message}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                DidUP non ha fornito altri dettagli per questo promemoria.
              </p>
            )}
            {reminder.subject && (
              <p className="mt-2 text-xs text-muted-foreground">{reminder.subject}</p>
            )}
            {reminder.teacher && (
              <p className="mt-1 text-xs text-muted-foreground">Docente: {reminder.teacher}</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                {reminder.date
                  ? fmtDate(reminder.date, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Senza data"}
              </span>
              {!read && (
                <button
                  type="button"
                  onClick={() => v.markRead([reminder.id])}
                  className="press inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold"
                >
                  <Check className="h-3.5 w-3.5" /> Segna come letto
                </button>
              )}
            </div>
            <button
              type="button"
              disabled={addedToVerifications}
              onClick={() => {
                const date = reminderDateToIso(reminder.date);
                const title = reminder.title.trim();
                const subject = reminder.subject?.trim() || title || "Promemoria";
                const notes = [
                  reminder.message?.trim(),
                  !date ? "Data non specificata nel promemoria: da definire." : undefined,
                ]
                  .filter(Boolean)
                  .join("\n\n");
                v.addInterrogazione({
                  subject,
                  date: date ?? "",
                  notes: notes || undefined,
                  reminderId: reminder.id,
                });
              }}
              className="press mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-xs font-semibold text-primary disabled:border-success/30 disabled:bg-success-soft disabled:text-success"
            >
              {addedToVerifications ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Aggiunto a Verifiche
                </>
              ) : (
                <>
                  <CalendarPlus className="h-3.5 w-3.5" /> Aggiungi a Verifiche
                </>
              )}
            </button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Promemoria</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Promemoria sincronizzati dal registro DidUP.
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Clock3 className="h-5 w-5" />
        </span>
      </div>

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold">Oggi e prossimamente</h2>
        {upcoming.length === 0 ? (
          <Empty
            icon={<Clock3 className="h-6 w-6" />}
            title="Nessun promemoria futuro"
            text={
              v.source === "demo"
                ? "I promemoria futuri appariranno quando colleghi i dati reali del registro."
                : "Non risultano promemoria futuri nei dati sincronizzati da DidUP."
            }
          />
        ) : (
          <ul className="space-y-3">{upcoming.map(renderReminder)}</ul>
        )}
      </section>

      <details className="card-surface mt-5 overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold">
          <span>Promemoria passati</span>
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            Ultimi 30 giorni <ChevronDown className="h-4 w-4" />
          </span>
        </summary>
        <div className="border-t border-border p-4">
          {past.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Non ci sono promemoria passati negli ultimi 30 giorni.
            </p>
          ) : (
            <ul className="space-y-3">{past.map(renderReminder)}</ul>
          )}
        </div>
      </details>
    </div>
  );
}
