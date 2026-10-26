import { createFileRoute } from "@tanstack/react-router";
import { Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/professori")({
  head: () => ({
    meta: [
      { title: "Professori — VOTO." },
      { name: "description", content: "Elenco dei docenti e delle materie." },
    ],
  }),
  component: Professori,
});

const TEACHERS = [
  ["ALESSANDRA' AMANDA", "Sostegno"],
  ["ARDORE IVAN", "Laboratorio di chimica"],
  ["CALABRESE STEFANIA", "Scienze integrate – Scienze della Terra e Biologia"],
  ["CALLERI GIUSI", "Diritto ed economia"],
  ["D'ALESSANDRO FEDERICA", "Scienze e tecnologie applicate"],
  ["DI NOTO EMANUELE", "Laboratorio di disegno – TTRG"],
  ["DI ROCCO ALICE", "Scienze integrate – Chimica"],
  ["FARACI ANNALISA (coord.)", "Storia, Italiano"],
  ["FASONE MARIANNA", "Inglese"],
  ["FIANDACA LORENA", "Scienze motorie e sportive"],
  ["GIAMMUSSO CLAUDIO STEFANO", "Laboratorio di fisica"],
  ["MAROTTA SALVATORE", "Scienze integrate – Fisica"],
  ["NICASTRO EMANUEL", "Laboratorio di disegno – TTRG"],
  ["RAPISARDA VANESSA MANUELA", "Matematica"],
  ["RIMMAUDO GIOVANNI", "Tecnologie e tecniche di rappresentazione grafica"],
  ["SAUNA CONCETTA GRAZIA", "Religione"],
] as const;

function Professori() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("it-IT");
    if (!normalized) return TEACHERS;
    return TEACHERS.filter(([name, subjects]) =>
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
