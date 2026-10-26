import { parseVotoData } from "./parse";
import type { VotoData } from "./types";

const iso = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Dati DEMO generati relativamente alla data odierna. Chiamare solo lato client. */
export function makeDemoRaw() {
  return {
    student: { name: "Studente Demo", className: "4B", schoolYear: "2026/2027" },
    updatedAt: new Date().toISOString(),
    previousAverage: 7.21,
    subjects: [
      {
        id: "matematica",
        name: "Matematica",
        color: "#E85D5D",
        grades: [
          {
            id: "m1",
            value: 6.5,
            date: iso(-34),
            type: "scritto",
            weight: 1,
            comment: "Disequazioni",
          },
          {
            id: "m2",
            value: 7,
            date: iso(-20),
            type: "orale",
            weight: 0.5,
            comment: "Interrogazione funzioni",
          },
          {
            id: "m3",
            value: "7+",
            date: iso(-5),
            type: "scritto",
            weight: 1,
            comment: "Equazioni esponenziali",
          },
        ],
      },
      {
        id: "italiano",
        name: "Italiano",
        color: "#D9A441",
        grades: [
          {
            id: "i1",
            value: 7.5,
            date: iso(-30),
            type: "scritto",
            weight: 1,
            comment: "Tema argomentativo",
          },
          {
            id: "i2",
            value: 8,
            date: iso(-12),
            type: "orale",
            weight: 1,
            comment: "Dante, Inferno XXVI",
          },
        ],
      },
      {
        id: "inglese",
        name: "Inglese",
        color: "#5DA9E8",
        grades: [
          {
            id: "e1",
            value: 8.5,
            date: iso(-26),
            type: "orale",
            weight: 1,
            comment: "Speaking: travel",
          },
          {
            id: "e2",
            value: 7.75,
            date: iso(-9),
            type: "scritto",
            weight: 1,
            comment: "Reading comprehension",
          },
          { id: "e3", value: 9, date: iso(-2), type: "orale", weight: 0.5 },
        ],
      },
      {
        id: "fisica",
        name: "Fisica",
        color: "#8FC27A",
        grades: [
          {
            id: "f1",
            value: 5.5,
            date: iso(-28),
            type: "scritto",
            weight: 1,
            comment: "Cinematica",
          },
          {
            id: "f2",
            value: 6.5,
            date: iso(-7),
            type: "pratico",
            weight: 0.5,
            comment: "Relazione di laboratorio",
          },
        ],
      },
      {
        id: "storia",
        name: "Storia",
        color: "#B48AD9",
        grades: [
          {
            id: "s1",
            value: 7,
            date: iso(-18),
            type: "orale",
            weight: 1,
            comment: "Rivoluzione francese",
          },
        ],
      },
      {
        id: "scienze",
        name: "Scienze",
        color: "#4FC1A6",
        grades: [
          { id: "c1", value: 8, date: iso(-22), type: "scritto", weight: 1, comment: "Genetica" },
          {
            id: "c2",
            value: "giust.",
            date: iso(-4),
            type: "orale",
            weight: 1,
            comment: "Assente giustificato",
          },
        ],
      },
    ],
    assignments: [
      {
        id: "a1",
        title: "Esercizi pagina 42",
        subject: "Matematica",
        dueDate: iso(0),
        dueTime: "18:00",
        completed: false,
        details: "Esercizi 1–8, logaritmi",
      },
      {
        id: "a2",
        title: "Ripasso capitolo 3",
        subject: "Storia",
        dueDate: iso(0),
        completed: false,
        details: "Età napoleonica",
      },
      {
        id: "a3",
        title: "Relazione laboratorio pendolo",
        subject: "Fisica",
        dueDate: iso(1),
        dueTime: "08:00",
        completed: false,
      },
      {
        id: "a4",
        title: "Essay: My future career",
        subject: "Inglese",
        dueDate: iso(3),
        completed: false,
        details: "250 parole",
      },
      {
        id: "a5",
        title: "Analisi del testo: Leopardi",
        subject: "Italiano",
        dueDate: iso(6),
        completed: false,
      },
      {
        id: "a6",
        title: "Schema sulla mitosi",
        subject: "Scienze",
        dueDate: iso(-1),
        completed: true,
      },
    ],
    notifications: [
      {
        id: "n1",
        type: "grade",
        title: "Nuovo voto in Inglese",
        message: "Orale: 9",
        date: iso(-2),
        subject: "Inglese",
        read: false,
      },
      {
        id: "n2",
        type: "notice",
        title: "Uscita anticipata",
        message: "Venerdì le lezioni terminano alle 12:10 per assemblea d'istituto.",
        date: iso(-1),
        read: false,
      },
      {
        id: "n3",
        type: "reminder",
        title: "Verifica di Fisica",
        message: "Dinamica, capitoli 4 e 5.",
        date: iso(4),
        subject: "Fisica",
        read: false,
      },
      {
        id: "n4",
        type: "note",
        title: "Nota disciplinare di classe",
        message: "Ritardo collettivo al rientro dall'intervallo.",
        date: iso(-8),
        read: true,
      },
    ],
    diary: [
      {
        id: "d1",
        date: iso(0),
        subject: "Matematica",
        teacher: "Prof.ssa Rossi",
        hour: "1",
        activity: "Ripasso delle equazioni esponenziali e introduzione ai logaritmi.",
      },
      {
        id: "d2",
        date: iso(0),
        subject: "Inglese",
        teacher: "Prof. Bianchi",
        hour: "2",
        activity: "Speaking activity: describing future plans and career goals.",
      },
      {
        id: "d3",
        date: iso(-1),
        subject: "Fisica",
        teacher: "Prof. Verdi",
        hour: "3",
        activity: "Esperienza di laboratorio sul pendolo semplice e raccolta delle misure.",
      },
      {
        id: "d4",
        date: iso(-1),
        subject: "Storia",
        teacher: "Prof.ssa Neri",
        hour: "4",
        activity: "L'età napoleonica: principali riforme e conseguenze in Europa.",
      },
      {
        id: "d5",
        date: iso(-3),
        subject: "Italiano",
        teacher: "Prof. Gallo",
        hour: "2",
        activity: "Analisi del testo poetico e figure retoriche in Leopardi.",
      },
    ],
  };
}

export const makeDemoData = (): VotoData => parseVotoData(makeDemoRaw());
