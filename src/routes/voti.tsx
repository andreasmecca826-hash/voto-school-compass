import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { useUi } from "@/components/voto/AppShell";
import { useState } from "react";
import { Chip, GradePill, ProgressBar, SubjectMark } from "@/components/voto/ui";
import { fmt, subjectStats } from "@/lib/voto/calc";
import { useSchoolPeriods } from "@/lib/voto/periods-context";
import { PeriodPicker } from "@/components/voto/PeriodPicker";

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

function Voti() {
  const { subjects } = useSchoolPeriods();
  const ui = useUi();
  const [sort, setSort] = useState<Sort>("nome");
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
                {s.teacher && (
                  <p className="text-[11px] text-muted-foreground">{s.teacher}</p>
                )}
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
