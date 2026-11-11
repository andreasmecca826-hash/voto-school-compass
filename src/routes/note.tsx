import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, EyeOff, StickyNote, UserRound } from "lucide-react";
import { useMemo } from "react";
import { Empty, SectionTitle } from "@/components/voto/ui";
import { fmtDate } from "@/lib/voto/dates";
import { useVoto } from "@/lib/voto/store";
import type { AppNotification } from "@/lib/voto/types";

export const Route = createFileRoute("/note")({
  head: () => ({
    meta: [
      { title: "Note — VOTO." },
      { name: "description", content: "Note disciplinari e annotazioni dal registro scolastico." },
    ],
  }),
  component: Note,
});

function Note() {
  const v = useVoto();
  const notes = useMemo(
    () =>
      v.data.notifications
        .filter((notification) => notification.type === "note")
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [v.data.notifications],
  );
  const studentName = (v.data.student.name || "ANDREA MARIA").toLocaleUpperCase("it-IT");

  if (v.registryStyle === "didup") {
    return (
      <DidupNotesPage
        notes={notes}
        studentName={studentName}
        isRead={(id, remote) => v.isRead(id, remote)}
        markRead={(ids) => v.markRead(ids)}
      />
    );
  }

  return (
    <div className="pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Note</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Note disciplinari e annotazioni ricevute dal registro.
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <StickyNote className="h-5 w-5" />
        </span>
      </div>

      <SectionTitle>Note dal registro</SectionTitle>
      {notes.length === 0 ? (
        <Empty
          icon={<StickyNote className="h-6 w-6" />}
          title="Nessuna nota"
          text={
            v.source === "demo"
              ? "Le note appariranno quando colleghi i dati reali del registro."
              : "Non risultano note nei dati sincronizzati."
          }
        />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => {
            const read = v.isRead(note.id, note.read);
            const message =
              note.message?.trim() && note.message.trim() !== note.title.trim()
                ? note.message.trim()
                : "";
            return (
              <li key={note.id} className={`card-surface p-4 ${!read ? "border-primary/30" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <StickyNote className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">{note.title}</h2>
                      {!read && (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Nuova
                        </span>
                      )}
                    </div>
                    {message ? (
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                        {message}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Il registro non ha fornito altri dettagli per questa nota.
                      </p>
                    )}
                    {note.subject && (
                      <p className="mt-2 text-xs text-muted-foreground">{note.subject}</p>
                    )}
                    {note.teacher && (
                      <p className="mt-1 text-xs text-muted-foreground">Docente: {note.teacher}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        {fmtDate(note.date, { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      {!read && (
                        <button
                          type="button"
                          onClick={() => v.markRead([note.id])}
                          className="press inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold"
                        >
                          <Check className="h-3.5 w-3.5" /> Segna come letta
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface DidupNotesPageProps {
  notes: AppNotification[];
  studentName: string;
  isRead: (id: string, remote: boolean) => boolean;
  markRead: (ids: string[]) => void;
}

function DidupNotesPage({ notes, studentName, isRead, markRead }: DidupNotesPageProps) {
  return (
    <div className="didup-page mx-auto min-h-dvh w-full max-w-[480px] bg-black pb-[112px] text-white">
      <header className="flex min-h-[112px] items-center justify-between gap-4 px-4 pb-4 pr-2 pt-7">
        <Link
          to="/"
          aria-label="Torna alla Home"
          className="flex h-10 w-9 shrink-0 items-center justify-start text-white/90"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={1.8} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-normal uppercase leading-tight tracking-[0.04em]">
            Note
          </h1>
          <p className="mt-1 truncate text-[12px] uppercase leading-tight text-white/90">
            {studentName}
          </p>
        </div>
        <img
          src="/didup-profile-reference.png"
          alt=""
          aria-hidden="true"
          className="h-[42px] w-[42px] shrink-0 rounded-full object-contain"
        />
      </header>

      {notes.length ? (
        <ul className="mt-4 space-y-3">
          {notes.map((note) => {
            const read = isRead(note.id, note.read);
            const noteTime = note.date?.match(/[T ](\d{1,2}:\d{2})(?::\d{2})?/i)?.[1];
            return (
              <li
                key={note.id}
                className="ml-[10px] mr-[2px] flex min-h-[228px] flex-col rounded-[12px] bg-[#252525] px-4 pb-4 pt-[18px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-white">
                    <UserRound className="h-4 w-4 shrink-0 fill-[#4169a8] text-[#4169a8]" />
                    <span className="truncate text-[16px] font-medium">
                      {note.teacher || "Nota"}
                    </span>
                  </div>
                  <EyeOff aria-hidden="true" className="h-5 w-5 shrink-0 text-white/75" />
                </div>

                {note.date && (
                  <time
                    dateTime={note.date}
                    className="mt-2 block text-[14px] font-medium uppercase tracking-wide text-[#08a5b5]"
                  >
                    {fmtDate(note.date, { day: "2-digit", month: "short", year: "2-digit" })
                      .replaceAll(".", "")
                      .toLocaleUpperCase("it-IT")}
                  </time>
                )}

                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 text-[15px] leading-5">
                  {noteTime && <span>ORE: {noteTime}</span>}
                  {noteTime && <span aria-hidden="true">−</span>}
                  <span className="italic text-[#08a5b5]">{note.subject || note.title}</span>
                </div>

                <p className="mt-6 whitespace-pre-line text-[16px] leading-[1.4] text-white">
                  {note.message || "Il testo della nota non è disponibile nei dati sincronizzati."}
                </p>

                <div className="mt-auto flex justify-end pt-5">
                  <button
                    type="button"
                    aria-pressed={read}
                    disabled={read}
                    onClick={() => markRead([note.id])}
                    className={`min-h-8 rounded-[12px] px-4 text-[12px] font-medium uppercase tracking-[0.04em] text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      read ? "bg-[#087f8d]" : "bg-[#08a5b5] hover:bg-[#0bb3c4]"
                    }`}
                  >
                    Presa visione
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mx-[10px] mt-[14px] rounded-[12px] bg-[#252525] px-5 py-8 text-center text-[15px] text-white/80">
          Nessuna nota nei dati sincronizzati.
        </div>
      )}
    </div>
  );
}
