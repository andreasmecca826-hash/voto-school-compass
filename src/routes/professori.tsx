import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useVoto } from "@/lib/voto/store";
import { getClassTeachers, saveClassTeachers } from "@/lib/voto/teachers";
import type { TeacherEntry } from "@/lib/voto/teachers";

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
  const voto = useVoto();
  const [teachers, setTeachers] = useState<TeacherEntry[]>(() => getClassTeachers());
  const [query, setQuery] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("it-IT");
    if (!normalized) return teachers.map((entry, index) => ({ entry, index }));
    return teachers
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) =>
        `${entry[0]} ${entry[1]}`.toLocaleLowerCase("it-IT").includes(normalized),
      );
  }, [query, teachers]);
  const registryTeachers = useMemo(() => {
    const grouped = new Map<string, { name: string; subjects: Set<string> }>();
    const add = (teacher: string, subject: string) => {
      const cleanName = teacher.trim();
      if (!cleanName) return;
      const key = cleanName.toLocaleLowerCase("it-IT");
      const current = grouped.get(key) ?? { name: cleanName, subjects: new Set<string>() };
      if (subject.trim()) current.subjects.add(subject.trim());
      grouped.set(key, current);
    };

    voto.data.subjects.forEach((subject) => {
      if (subject.teacher) add(subject.teacher, subject.name);
    });
    teachers.forEach(([teacher, subject]) => add(teacher, subject));

    return [...grouped.values()]
      .map(
        ({ name: teacher, subjects: teacherSubjects }) =>
          [teacher, [...teacherSubjects].join(" // ")] as TeacherEntry,
      )
      .sort(([a], [b]) => a.localeCompare(b, "it-IT"));
  }, [teachers, voto.data.subjects]);

  const resetForm = () => {
    setEditingIndex(null);
    setName("");
    setSubjects("");
  };

  const saveTeacher = () => {
    const cleanName = name.trim();
    const cleanSubjects = subjects.trim() || "Materia non specificata";
    if (!cleanName) {
      toast.error("Inserisci il nome del professore.");
      return;
    }
    const next = [...teachers];
    const entry: TeacherEntry = [cleanName, cleanSubjects];
    if (editingIndex === null) next.push(entry);
    else next[editingIndex] = entry;
    setTeachers(next);
    saveClassTeachers(next);
    resetForm();
    toast.success(editingIndex === null ? "Professore aggiunto" : "Professore aggiornato");
  };

  const editTeacher = (index: number) => {
    const entry = teachers[index];
    if (!entry) return;
    setEditingIndex(index);
    setName(entry[0]);
    setSubjects(entry[1]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteTeacher = (index: number) => {
    const next = teachers.filter((_, currentIndex) => currentIndex !== index);
    setTeachers(next);
    saveClassTeachers(next);
    if (editingIndex === index) resetForm();
    toast.success("Professore rimosso");
  };

  const managementTools = (
    <>
      <section className="card-surface mt-5 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            {editingIndex === null ? "Aggiungi professore" : "Modifica professore"}
          </h2>
          {editingIndex !== null && (
            <button type="button" onClick={resetForm} className="text-xs text-muted-foreground">
              <X className="mr-1 inline h-3.5 w-3.5" /> Annulla
            </button>
          )}
        </div>
        <div className="mt-3 space-y-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome e cognome"
            aria-label="Nome del professore"
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <input
            value={subjects}
            onChange={(event) => setSubjects(event.target.value)}
            placeholder="Materia o materie"
            aria-label="Materia del professore"
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <button
            type="button"
            onClick={saveTeacher}
            className="press flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground"
          >
            {editingIndex === null ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editingIndex === null ? "Aggiungi" : "Salva modifiche"}
          </button>
        </div>
      </section>

      <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3">
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
        {filtered.map(({ entry, index }) => (
          <article key={`${entry[0]}-${index}`} className="card-surface flex items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary">
              {entry[0].charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">{entry[0]}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{entry[1]}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => editTeacher(index)}
                className="press rounded-lg p-2 text-muted-foreground"
                aria-label={`Modifica ${entry[0]}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => deleteTeacher(index)}
                className="press rounded-lg p-2 text-danger"
                aria-label={`Rimuovi ${entry[0]}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="card-surface p-5 text-center text-sm text-muted-foreground">
            {teachers.length === 0
              ? "Non hai ancora inserito professori."
              : "Nessun professore o materia trovata."}
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        La lista viene salvata solo su questo dispositivo.
      </p>
    </>
  );

  if (voto.registryStyle === "didup") {
    const studentName = (voto.data.student.name ?? "").toUpperCase();
    return (
      <div className="didup-page min-h-dvh bg-black px-0 pb-[100px] text-white">
        <header className="flex items-start justify-between px-4 pt-5">
          <div className="flex min-w-0 items-start">
            <Link
              to="/"
              aria-label="Torna alla Home"
              className="press flex h-10 w-7 shrink-0 items-center justify-start text-white"
            >
              <ChevronLeft className="h-8 w-8" strokeWidth={1.8} />
            </Link>
            <div className="ml-8 min-w-0 pt-0.5">
              <h1 className="text-[21px] font-normal leading-6">CONDIVISIONE</h1>
              {studentName && <p className="mt-0.5 text-[14px] leading-5">{studentName}</p>}
            </div>
          </div>
          <img
            src="/didup-profile.jpg"
            alt=""
            aria-hidden="true"
            className="h-[50px] w-[50px] shrink-0 object-cover"
          />
        </header>

        <h2 className="mx-6 mt-[58px] text-[20px] font-normal leading-7">DOCENTI</h2>
        {registryTeachers.length ? (
          <ul className="mt-8 divide-y divide-[#484848] bg-[#292929]">
            {registryTeachers.map(([teacher, teacherSubjects]) => (
              <li key={teacher} className="flex min-h-[130px] items-center gap-4 px-5 py-5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-[20px] w-[20px] shrink-0 fill-[#34558b]"
                >
                  <circle cx="12" cy="7" r="4" />
                  <path d="M3 21v-1.5c0-3.7 3.8-6.5 9-6.5s9 2.8 9 6.5V21H3Z" />
                </svg>
                <div className="min-w-0 flex-1 self-center">
                  <h3 className="text-[18px] font-normal uppercase leading-6">{teacher}</h3>
                  {teacherSubjects && (
                    <p className="mt-1.5 text-[14px] uppercase leading-5 text-[#16a0ae]">
                      ({teacherSubjects})
                    </p>
                  )}
                  <p className="mt-3 text-[12px] uppercase leading-5 text-[#c4c4c4]">
                    N° DOCUMENTI DOCENTE: — - STUDENTE: —
                  </p>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="h-6 w-6 shrink-0 text-white/80"
                  strokeWidth={1.7}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mx-5 mt-8 bg-[#292929] px-5 py-8 text-center text-sm text-white/70">
            Nessun docente disponibile nei dati del registro.
          </p>
        )}

        <details className="mx-4 mt-5 rounded-lg bg-[#292929] p-4">
          <summary className="cursor-pointer text-sm text-white/80">
            Gestisci elenco manuale
          </summary>
          <div className="pt-1">{managementTools}</div>
        </details>
      </div>
    );
  }

  return (
    <div className="pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Professori</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Inserisci manualmente i docenti della tua classe.
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <UsersRound className="h-5 w-5" />
        </span>
      </div>
      {managementTools}
    </div>
  );
}
