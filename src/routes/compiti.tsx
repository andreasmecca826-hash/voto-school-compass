import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarCheck, Share2, UserRound } from "lucide-react";
import { useState } from "react";
import { AssignmentRow } from "@/components/voto/AssignmentRow";
import { Chip, Empty, SectionTitle } from "@/components/voto/ui";
import { daysBetween, fmtDate } from "@/lib/voto/dates";
import { useClock, useVoto } from "@/lib/voto/store";
import type { Assignment } from "@/lib/voto/types";

export const Route = createFileRoute("/compiti")({
  head: () => ({
    meta: [
      { title: "Compiti — VOTO." },
      { name: "description", content: "Compiti di oggi, prossimi e completati." },
      { property: "og:title", content: "Compiti — VOTO." },
      { property: "og:description", content: "Compiti di oggi, prossimi e completati." },
    ],
  }),
  component: Compiti,
});

function Compiti() {
  const v = useVoto();
  const now = useClock();
  const [subj, setSubj] = useState<string>("all");
  const subjects = [
    ...new Set(v.data.assignments.map((a) => a.subject).filter(Boolean)),
  ] as string[];
  const all = v.data.assignments
    .filter((a) => subj === "all" || a.subject === subj)
    .sort((a, b) =>
      `${a.dueDate ?? "9"}${a.dueTime ?? ""}`.localeCompare(
        `${b.dueDate ?? "9"}${b.dueTime ?? ""}`,
      ),
    );
  const done = all.filter((a) => v.isDone(a.id, a.completed));
  const open = all.filter((a) => !v.isDone(a.id, a.completed));
  const today = open.filter((a) => a.dueDate && daysBetween(now, a.dueDate) <= 0);
  const next = open.filter((a) => !a.dueDate || daysBetween(now, a.dueDate) > 0);

  if (v.registryStyle === "didup") {
    return (
      <DidupCompitiPage
        assignments={v.data.assignments}
        studentName={(v.data.student.name || "ANDREA MARIA").toLocaleUpperCase("it-IT")}
      />
    );
  }

  const group = (title: string, items: Assignment[]) => (
    <>
      <SectionTitle>
        {title} <span className="text-muted-foreground">· {items.length}</span>
      </SectionTitle>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((a) => (
            <AssignmentRow key={a.id} a={a} />
          ))}
        </ul>
      ) : (
        <Empty icon={<CalendarCheck className="h-6 w-6" />} title="Niente qui" />
      )}
    </>
  );

  return (
    <div className="pt-3">
      <h1 className="font-display text-2xl font-semibold">Compiti</h1>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        <Chip active={subj === "all"} onClick={() => setSubj("all")}>
          Tutte
        </Chip>
        {subjects.map((s) => (
          <Chip key={s} active={subj === s} onClick={() => setSubj(s)}>
            {s}
          </Chip>
        ))}
      </div>
      {group("Oggi", today)}
      {group("Prossimi", next)}
      {group("Completati", done)}
    </div>
  );
}

type DidupSort = "delivery" | "subject" | "assignment";

interface AssignmentGroup {
  key: string;
  label: string;
  items: Assignment[];
}

function DidupCompitiPage({
  assignments,
  studentName,
}: {
  assignments: Assignment[];
  studentName: string;
}) {
  const [sortBy, setSortBy] = useState<DidupSort>("delivery");

  const groups = (() => {
    const sorted = [...assignments].sort((a, b) => {
      if (sortBy === "subject")
        return (
          (a.subject || "").localeCompare(b.subject || "", "it") ||
          (a.dueDate || "").localeCompare(b.dueDate || "")
        );
      if (sortBy === "assignment") return a.title.localeCompare(b.title, "it");
      return (b.dueDate || "").localeCompare(a.dueDate || "");
    });

    if (sortBy === "assignment") {
      return [{ key: "assignments", label: "ASSEGNAZIONI", items: sorted }];
    }

    const groupKey = (assignment: Assignment) =>
      sortBy === "subject"
        ? assignment.subject?.trim() || "Materia non specificata"
        : assignment.dueDate?.slice(0, 10) || "";
    const buckets = new Map<string, Assignment[]>();
    sorted.forEach((assignment) => {
      const key = groupKey(assignment);
      buckets.set(key, [...(buckets.get(key) ?? []), assignment]);
    });

    return [...buckets.entries()]
      .sort(([a], [b]) => {
        if (sortBy === "subject") return a.localeCompare(b, "it");
        return b.localeCompare(a);
      })
      .map(([key, items]) => ({
        key: key || "no-due-date",
        label:
          sortBy === "subject"
            ? `MATERIA: ${key}`
            : key
              ? `DA CONSEGNARE IL ${fmtDate(key, { day: "numeric", month: "long" }).toLocaleUpperCase("it-IT")}`
              : "SENZA DATA DI CONSEGNA",
        items,
      }));
  })();

  function shareGroup(group: AssignmentGroup) {
    const text = group.items
      .map((assignment) => {
        const subject = assignment.subject ? `${assignment.subject}: ` : "";
        return `${subject}${assignment.details || assignment.title}`;
      })
      .join("\n");

    if (navigator.share) {
      void navigator.share({ title: group.label, text }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  return (
    <div className="didup-page mx-auto min-h-dvh w-full max-w-[480px] bg-black pb-[112px] text-white">
      <header className="flex min-h-[112px] items-center justify-between gap-4 px-4 pb-4 pr-[14px] pt-7">
        <Link
          to="/"
          aria-label="Torna alla Home"
          className="flex h-10 w-9 shrink-0 items-center justify-start text-white/90"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={1.8} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-normal uppercase leading-tight tracking-[0.04em]">
            Compiti
          </h1>
          <p className="mt-1 truncate text-[12px] uppercase leading-tight text-white/90">
            {studentName}
          </p>
        </div>
        <img
          src="/didup-profile-reference.png"
          alt=""
          aria-hidden="true"
          className="h-[43px] w-[43px] shrink-0 rounded-full object-contain"
        />
      </header>

      <section className="mx-5 mt-4" aria-label="Ordina compiti">
        <p className="pl-[10px] text-[12px] uppercase tracking-wide text-white/65">Ordina per</p>
        <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-[8px] bg-[#252525]">
          {(
            [
              ["delivery", "Consegna"],
              ["subject", "Materia"],
              ["assignment", "Assegnazione"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={sortBy === value}
              onClick={() => setSortBy(value)}
              className={`min-h-[52px] px-2 text-[12px] font-normal uppercase tracking-[0.025em] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                sortBy === value ? "bg-[#08a5b5] text-white" : "text-white/90 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {groups.length ? (
        <div className="mt-[56px] space-y-10">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <div className="flex items-center justify-between gap-3 px-5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <img
                    src="/didup-calendar-reference.png"
                    alt=""
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 object-contain"
                  />
                  <h2 className="truncate text-[12px] font-normal uppercase tracking-[0.035em]">
                    {group.label}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label={`Condividi ${group.label.toLocaleLowerCase("it-IT")}`}
                  onClick={() => shareGroup(group)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/75 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08a5b5]"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              <ul className="mt-6 space-y-9">
                {group.items.map((assignment) => {
                  const title = assignment.subject || assignment.title;
                  const description =
                    assignment.details ||
                    (assignment.subject && assignment.title !== assignment.subject
                      ? assignment.title
                      : "");
                  return (
                    <li
                      key={assignment.id}
                      className="ml-5 mr-3 flex min-h-[180px] flex-col rounded-[12px] bg-[#252525] pb-3 pl-5 pr-3 pt-6"
                    >
                      <h3 className="text-[15px] font-medium uppercase leading-[1.3] tracking-[0.02em]">
                        {title}
                      </h3>
                      {assignment.teacher && (
                        <div className="mt-1 flex items-center gap-2 text-[13px] uppercase text-white/95">
                          <UserRound className="h-4 w-4 shrink-0 fill-[#4169a8] text-[#4169a8]" />
                          <span>{assignment.teacher}</span>
                        </div>
                      )}
                      {description && (
                        <p className="mt-[36px] whitespace-pre-line text-[15px] leading-[1.4] text-white/90">
                          {description}
                        </p>
                      )}
                      <div
                        className={`flex items-center justify-end gap-2 text-[12px] uppercase tracking-wide text-[#08a5b5] ${
                          description ? "mt-[26px]" : "mt-auto pt-6"
                        }`}
                      >
                        <img
                          src="/didup-clock-reference.png"
                          alt=""
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 object-contain"
                        />
                        <span>
                          {assignment.assignedDate
                            ? `Assegnati il ${fmtDate(assignment.assignedDate, {
                                day: "2-digit",
                                month: "long",
                              }).toLocaleUpperCase("it-IT")}`
                            : "Assegnato"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="mx-5 mt-[60px] text-center text-[15px] text-white/75">
          Nessun compito nei dati sincronizzati.
        </div>
      )}
    </div>
  );
}
