import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarCheck, ChevronDown, ChevronUp, Share2, UserRound } from "lucide-react";
import { useState } from "react";
import { AssignmentRow } from "@/components/voto/AssignmentRow";
import { Chip, Empty, SectionTitle } from "@/components/voto/ui";
import { daysBetween, fmtDate } from "@/lib/voto/dates";
import { useClock, useVoto } from "@/lib/voto/store";
import type { Assignment } from "@/lib/voto/types";
import {
  groupDidupAssignments,
  type AssignmentGroup,
  type DidupSort,
} from "@/lib/voto/didup-assignments";

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

function DidupCompitiPage({
  assignments,
  studentName,
}: {
  assignments: Assignment[];
  studentName: string;
}) {
  const [sortBy, setSortBy] = useState<DidupSort>("assignment");
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const [showAllBySubject, setShowAllBySubject] = useState<Record<string, boolean>>({});
  const groups = groupDidupAssignments(assignments, sortBy);

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
              className={`min-h-[48px] px-2 text-[12px] font-normal uppercase tracking-[0.025em] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                sortBy === value ? "bg-[#08a5b5] text-white" : "text-white/90 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {groups.length ? sortBy === "subject" ? (
        <div className="mt-[20px] space-y-0">
          {groups.map((group) => {
            const isOpen = Boolean(openSubjects[group.key]);
            const showAll = Boolean(showAllBySubject[group.key]);
            const visibleItems = showAll ? group.items : group.items.slice(0, 1);
            return (
              <section
                key={group.key}
                className={`overflow-hidden rounded-[4px] bg-[#252525] ${isOpen ? "mt-4" : ""}`}
                aria-label={group.label}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenSubjects((current) => ({ ...current, [group.key]: !current[group.key] }))
                  }
                  className="flex min-h-[58px] w-full items-center justify-between gap-4 border-b border-white/15 px-8 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#08a5b5]"
                >
                  <span className="text-[14px] font-normal uppercase leading-tight tracking-[0.035em]">
                    {group.label}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-white/65" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white/65" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-4">
                    {visibleItems.map((assignment) => {
                      const description = assignment.details || assignment.title;
                      return (
                        <article key={assignment.id} className="py-2">
                          <div className="space-y-1">
                            {assignment.assignedDate && (
                              <div className="flex items-center gap-2 text-[12px] uppercase leading-5">
                                <img
                                  src="/didup-calendar-reference.png"
                                  alt=""
                                  aria-hidden="true"
                                  className="h-4 w-4 shrink-0 object-contain"
                                />
                                <span>
                                  Assegnato il {fmtDate(assignment.assignedDate, {
                                    day: "2-digit",
                                    month: "long",
                                  }).toLocaleUpperCase("it-IT")}
                                </span>
                              </div>
                            )}
                            {assignment.teacher && (
                              <div className="flex items-center gap-2 text-[12px] uppercase leading-5">
                                <UserRound className="h-4 w-4 shrink-0 fill-[#4169a8] text-[#4169a8]" />
                                <span>{assignment.teacher}</span>
                              </div>
                            )}
                          </div>

                          {description && (
                            <p className="mt-6 whitespace-pre-line text-[14px] leading-[1.45] text-white/90">
                              {description}
                            </p>
                          )}

                          {assignment.dueDate && (
                            <div className="mt-6 flex items-center justify-end gap-2 text-[12px] uppercase tracking-wide text-[#08a5b5]">
                              <img
                                src="/didup-clock-reference.png"
                                alt=""
                                aria-hidden="true"
                                className="h-4 w-4 shrink-0 object-contain"
                              />
                              <span>
                                Consegna il {fmtDate(assignment.dueDate, {
                                  weekday: "long",
                                  day: "2-digit",
                                  month: "long",
                                }).toLocaleUpperCase("it-IT")}
                              </span>
                            </div>
                          )}
                        </article>
                      );
                    })}

                    {group.items.length > 1 && (
                      <div className="mt-5 flex justify-end border-t border-white/15 pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllBySubject((current) => ({
                              ...current,
                              [group.key]: !current[group.key],
                            }))
                          }
                          className="rounded-full bg-[#08a5b5] px-5 py-2 text-[13px] italic text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          {showAll ? "Mostra meno" : "Mostra tutto"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
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
                  const assignmentFooter =
                    sortBy === "assignment"
                      ? assignment.dueDate
                        ? `Da consegnare il ${fmtDate(assignment.dueDate, {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                          }).toLocaleUpperCase("it-IT")}`
                        : null
                      : assignment.assignedDate
                        ? `Assegnati il ${fmtDate(assignment.assignedDate, {
                            day: "2-digit",
                            month: "long",
                          }).toLocaleUpperCase("it-IT")}`
                        : "Assegnato";
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
                      {assignmentFooter && (
                        <div
                          className={`flex items-center justify-end gap-2 text-[12px] uppercase tracking-wide text-[#08a5b5] ${
                            description ? "mt-[26px]" : "mt-auto pt-6"
                          }`}
                        >
                          <img
                            src={
                              sortBy === "assignment"
                                ? "/didup-clock-reference.png"
                                : "/didup-calendar-reference.png"
                            }
                            alt=""
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 object-contain"
                          />
                          <span>{assignmentFooter}</span>
                        </div>
                      )}
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
