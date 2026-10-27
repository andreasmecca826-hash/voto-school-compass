export const CLASS_TEACHERS = [
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

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function teachersForSubject(subject: string) {
  const normalizedSubject = normalize(subject);
  if (!normalizedSubject) return [];

  const asksLab = asksForLaboratory(subject);
  const subjectCore = normalizedSubject
    .replace(/\b(?:laboratori|laboratorio|lab)\b/g, " ")
    .replace(/\bdi\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const matches = CLASS_TEACHERS.filter(([, subjects]) => {
    const normalizedSubjects = normalize(subjects);
    return (
      normalizedSubjects.includes(normalizedSubject) ||
      (subjectCore.length > 0 && normalizedSubjects.includes(subjectCore))
    );
  });

  if (asksLab) return matches.filter(([, subjects]) => asksForLaboratory(subjects));
  const nonLabMatches = matches.filter(([, subjects]) => !asksForLaboratory(subjects));
  return nonLabMatches.length ? nonLabMatches : matches;
}

export function asksForLaboratory(query: string) {
  return /\b(?:lab|laboratorio|laboratori)\b/.test(normalize(query));
}

export function teachersForSubjectQuestion(question: string) {
  const subject = normalize(question)
    .replace(/[?!.,:;]/g, " ")
    .replace(
      /^(?:chi insegna|quale (?:docente|professore|professoressa|prof) insegna|chi e (?:il|la) (?:docente|professore|professoressa|prof) di|(?:docente|professore|professoressa|prof) di)\s*/,
      "",
    )
    .replace(/^(?:la|il|lo|i|gli|le|l)\s+/, "")
    .trim();
  return teachersForSubject(subject);
}
