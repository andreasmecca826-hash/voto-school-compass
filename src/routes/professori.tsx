import { createFileRoute } from "@tanstack/react-router";
import { Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { CLASS_TEACHERS } from "@/lib/voto/teachers";

export const Route = createFileRoute("/professori")({
  head: () => ({
    meta: [
      { title: "Professori — VOTO." },
      { name: "description", content: "Elenco dei docenti e delle materie." },
    ],
  }),
  component: Professori,
});

function Professori() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("it-IT");
    if (!normalized) return CLASS_TEACHERS;
    return CLASS_TEACHERS.filter(([name, subjects]) =>
      `${name} ${subjects}`.toLocaleLowerCase("it-IT").includes(normalized),
    );
  }, [query]);

  return (
    <div className="pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Professori</h1>
          <p className="mt-1 text-xs text-muted-foreground">Docenti e materie della tua classe.</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <UsersRound className="h-5 w-5" />
        </span>
      </div>

      <label className="mt-5 flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca professore o materia..."
          aria-label="Cerca professore o materia"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      <div className="mt-4 space-y-2">
        {filtered.map(([name, subjects]) => (
          <article key={name} className="card-surface flex items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary">
              {name.charAt(0)}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{subjects}</p>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="card-surface p-5 text-center text-sm text-muted-foreground">
            Nessun professore o materia trovata.
          </div>
        )}
      </div>
    </div>
  );
}
