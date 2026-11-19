import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/lib/voto/assistant";
import { emptySchedule } from "@/lib/voto/orario";
import type { VotoData } from "@/lib/voto/types";

const data: VotoData = {
  student: { name: "Demo" },
  previousAverage: 7,
  subjects: [
    {
      id: "inglese",
      name: "Inglese",
      grades: [
        { id: "g1", value: 7, label: "7", date: "2026-10-01", type: "orale", weight: 1 },
        { id: "g2", value: 7, label: "7", date: "2026-10-10", type: "scritto", weight: 1 },
      ],
    },
  ],
  assignments: [{ id: "a1", title: "Esercizi", completed: false }],
  notifications: [],
  diary: [],
  attendance: {
    absenceDays: 2,
    absenceHours: 12,
    delays: 1,
    earlyExits: 0,
    annualHours: 990,
    absenceLimitHours: 264,
  },
};

describe("risposte generali locali su VOTO e scuola", () => {
  it("spiega fedelmente le medie usate dall'app senza intercettare la media personale", () => {
    const explanation = answerQuestion("Come si calcola la media ponderata in VOTO?", data);
    expect(explanation).toContain("pesi dei voti registrati");
    expect(explanation).toContain("media semplice delle medie delle materie");
    expect(explanation).toContain("né una valutazione ufficiale");
    expect(answerQuestion("Qual è la mia media generale?", data)).toContain("7,00");
  });

  it("offre indicazioni deterministiche per lo studio e per preparare una verifica", () => {
    expect(answerQuestion("Come ricordare meglio quello che studio?", data)).toContain(
      "chiudi gli appunti e prova a spiegare",
    );
    expect(answerQuestion("Come mi preparo a una verifica?", data)).toContain(
      "programma e criteri indicati dal docente",
    );
    expect(answerQuestion("Qual è il voto sufficiente nell’indicatore colori?", data)).toContain(
      "non stabilisce da sola l’esito dell’anno",
    );
    expect(
      answerQuestion("Qual è la differenza tra Circolari e Comunicazioni in VOTO?", data),
    ).toContain("avvisi di testo senza un allegato associato");
  });

  it("preserva i flussi dati-specifici per planner e prossime interrogazioni", () => {
    expect(answerQuestion("Cosa devo studiare questa settimana?", data)).toContain(
      "scegli tu ogni sessione",
    );
    const agenda = [
      {
        id: "future",
        subject: "Inglese",
        date: "2026-10-29",
        completed: false,
        checklist: [{ id: "topic", label: "Studiare gli argomenti", done: false }],
      },
    ];
    const answer = answerQuestion(
      "Cosa devo preparare per la prossima interrogazione?",
      data,
      emptySchedule(),
      new Date(2026, 9, 27, 12),
      agenda,
    );
    expect(answer).toContain("Studiare gli argomenti");
    expect(answer).not.toContain("Per preparare una verifica o un’interrogazione:");
  });

  it("non sostituisce con consigli generali la richiesta sugli argomenti già in agenda", () => {
    const agenda = [
      {
        id: "future",
        subject: "Inglese",
        date: "2026-10-29",
        completed: false,
        checklist: [{ id: "topic", label: "Ripassare i verbi", done: false }],
      },
    ];
    const answer = answerQuestion(
      "Quali argomenti devo preparare per l’interrogazione di Inglese?",
      data,
      emptySchedule(),
      new Date(2026, 9, 27, 12),
      agenda,
    );
    expect(answer).toContain("Ripassare i verbi");
    expect(answer).not.toContain("Per preparare una verifica o un’interrogazione:");
  });

  it("risponde sugli orari degli uffici e non inventa quelli del fine settimana", () => {
    const answer = answerQuestion("Quali sono gli orari di apertura degli uffici?", data);
    expect(answer).toContain("Lunedì, mercoledì e venerdì dalle 10:00 alle 12:00");
    expect(answer).toContain("martedì e giovedì dalle 16:00 alle 17:00");
    expect(answer).toContain("non è visibile una data di validità");
    expect(answerQuestion("Sabato la segreteria è aperta?", data)).toContain(
      "non specifica gli orari per sabato o domenica",
    );
  });

  it("risponde con l’appuntamento del dirigente e la sede dell’Istituto", () => {
    expect(answerQuestion("Il dirigente scolastico riceve su appuntamento?", data)).toContain(
      "Prof. Franco Ferrara e riceve per appuntamento",
    );
    expect(answerQuestion("Dove si trova l’I.I.S. Morselli-Sturzo?", data)).toContain(
      "Via Pitagora s.n.c., 93012 Gela (Caltanissetta)",
    );
  });

  it("supporta saluti senza chiamate o dipendenze di rete", () => {
    expect(answerQuestion("Ciao!", data)).toContain("offline");
    expect(answerQuestion("Grazie mille", data)).toContain("Di nulla");
  });
});
