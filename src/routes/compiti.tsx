import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { useState } from "react";
import { AssignmentRow } from "@/components/voto/AssignmentRow";
import { Chip, Empty, SectionTitle } from "@/components/voto/ui";
import { daysBetween } from "@/lib/voto/dates";
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
  const subjects = [...new Set(v.data.assignments.map((a) => a.subject).filter(Boolean))] as string[];
  const all = v.data.assignments
    .filter((a) => subj === "all" || a.subject === subj)
    .sort((a, b) => `${a.dueDate ?? "9"}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate ?? "9"}${b.dueTime ?? ""}`));
  const done = all.filter((a) => v.isDone(a.id, a.completed));
  const open = all.filter((a) => !v.isDone(a.id, a.completed));
  const today = open.filter((a) => a.dueDate && daysBetween(now, a.dueDate) <= 0);
  const next = open.filter((a) => !a.dueDate || daysBetween(now, a.dueDate) > 0);

  const group = (title: string, items: Assignment[]) => (
    <>
      <SectionTitle>{title} <span className="text-muted-foreground">· {items.length}</span></SectionTitle>
      {items.length ? <ul className="space-y-2">{items.map((a) => <AssignmentRow key={a.id} a={a} />)}</ul>
        : <Empty icon={<CalendarCheck className="h-6 w-6" />} title="Niente qui" />}
    </>
  );

  return (
    <div className="pt-3">
      <h1 className="font-display text-2xl font-semibold">Compiti</h1>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        <Chip active={subj === "all"} onClick={() => setSubj("all")}>Tutte</Chip>
        {subjects.map((s) => <Chip key={s} active={subj === s} onClick={() => setSubj(s)}>{s}</Chip>)}
      </div>
      {group("Oggi", today)}
      {group("Prossimi", next)}
      {group("Completati", done)}
    </div>
  );
}
