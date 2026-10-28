import { describe, expect, it } from "vitest";
import { answerQuestion, scheduleDayToClear } from "@/lib/voto/assistant";
import { pickAssistantSuggestions } from "@/lib/voto/assistant-suggestions";
import type { Interrogazione } from "@/lib/voto/interrogazioni";
import { emptySchedule } from "@/lib/voto/orario";
import { saveClassTeachers } from "@/lib/voto/teachers";
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

describe("Assistente locale", () => {
  it("calcola il voto necessario per una materia e un obiettivo", () => {
    expect(answerQuestion("Quanto devo prendere in Inglese per arrivare a 8?", data)).toContain(
      "almeno 10",
    );
  });

  it("risponde su media generale, compiti e assenze", () => {
    expect(answerQuestion("Qual è la mia media generale?", data)).toContain("7,00");
    expect(answerQuestion("Quanti compiti devo fare?", data)).toContain("1 compito");
    expect(answerQuestion("Quante assenze ho?", data)).toContain("2 giorni");
  });

  it("calcola la previsione dopo un voto ipotetico e riconosce un'azione", () => {
    expect(answerQuestion("Che previsione media avrò se prendo 8 in Inglese?", data)).toContain(
      "passerebbe",
    );
    expect(scheduleDayToClear("Cancella tutto l'orario di lunedì")).toBe("lunedi");
  });

  it("risponde sull'orario del giorno e sulle scadenze dei compiti", () => {
    const schedule = emptySchedule();
    schedule.lunedi[0] = "Matematica";
    schedule.lunedi[2] = "Inglese";
    const now = new Date(2026, 9, 26, 12);
    expect(answerQuestion("Che lezioni ho oggi?", data, schedule, now)).toContain(
      "1ª ora: Matematica",
    );
    expect(answerQuestion("Che lezioni ho oggi?", data, schedule, now)).toContain(
      "3ª ora: Inglese",
    );

    const dueData: VotoData = {
      ...data,
      assignments: [
        { id: "a2", title: "Tema", completed: false, dueDate: "2026-10-27" },
        { id: "a3", title: "Studio", completed: false, dueDate: "2026-10-29" },
      ],
    };
    expect(answerQuestion("Quali compiti scadono domani?", dueData, schedule, now)).toContain(
      "Tema",
    );
  });

  it("trova l'ultima circolare, l'ultimo voto e il voto più alto di una materia", () => {
    const noticeData: VotoData = {
      ...data,
      notifications: [
        {
          id: "n1",
          type: "notice",
          title: "Comunicazione elezioni",
          date: "2026-10-20",
          attachmentName: "comunicazione.pdf",
          read: false,
        },
      ],
    };
    expect(answerQuestion("Qual è l'ultima circolare?", noticeData)).toContain(
      "Comunicazione elezioni",
    );
    expect(answerQuestion("Qual è l'ultimo voto?", data)).toContain("Inglese");
    expect(answerQuestion("Qual è il voto più alto in Inglese?", data)).toContain("7,00");
  });

  it("filtra le circolari di oggi e compone un riepilogo delle novità", () => {
    const now = new Date(2026, 9, 27, 12);
    const updateData: VotoData = {
      ...data,
      notifications: [
        {
          id: "today-1",
          type: "notice",
          title: "Assemblea di classe",
          date: "2026-10-27",
          read: false,
        },
        {
          id: "today-2",
          type: "notice",
          title: "Uscita anticipata",
          date: "2026-10-27",
          read: true,
        },
        {
          id: "yesterday",
          type: "notice",
          title: "Avviso precedente",
          date: "2026-10-26",
          read: false,
        },
      ],
    };
    const todaysCirculars = answerQuestion(
      "Quali sono le nuove circolari di oggi?",
      updateData,
      emptySchedule(),
      now,
    );
    expect(todaysCirculars).toContain("Assemblea di classe");
    expect(todaysCirculars).toContain("Uscita anticipata");
    expect(todaysCirculars).not.toContain("Avviso precedente");

    const summary = answerQuestion("Quali sono le novità?", updateData, emptySchedule(), now);
    expect(summary).toContain("Ultimo voto");
    expect(summary).toContain("Assemblea di classe");
  });

  it("riconosce i promemoria DidUP e risponde per oggi e domani", () => {
    const now = new Date(2026, 9, 27, 12);
    const reminderData: VotoData = {
      ...data,
      notifications: [
        {
          id: "reminder-today",
          type: "reminder",
          title: "Promemoria",
          message: "Portare il libro",
          subject: "Italiano",
          date: "2026-10-27",
          read: false,
        },
        {
          id: "reminder-tomorrow",
          type: "reminder",
          title: "Promemoria",
          message: "Verifica di algebra",
          subject: "Matematica",
          date: "2026-10-28",
          read: false,
        },
      ],
    };
    expect(
      answerQuestion("Quali promemoria ho oggi?", reminderData, emptySchedule(), now),
    ).toContain("Portare il libro");
    expect(
      answerQuestion("Cosa devo ricordare domani?", reminderData, emptySchedule(), now),
    ).toContain("Verifica di algebra");
    expect(answerQuestion("Quali promemoria ho?", reminderData, emptySchedule(), now)).toContain(
      "Promemoria DidUP",
    );
  });

  it("separa i promemoria futuri da quelli passati e limita l’archivio a 30 giorni", () => {
    const now = new Date(2026, 9, 27, 12);
    const datedReminders: VotoData = {
      ...data,
      notifications: [
        {
          id: "old-31",
          type: "reminder",
          title: "Troppo vecchio",
          date: "2026-09-26",
          read: false,
        },
        { id: "old-30", type: "reminder", title: "Ultimo mese", date: "2026-09-27", read: false },
        { id: "today", type: "reminder", title: "Oggi", date: "2026-10-27", read: false },
        { id: "future", type: "reminder", title: "Domani", date: "2026-10-28", read: false },
      ],
    };
    const upcoming = answerQuestion("Quali promemoria ho?", datedReminders, emptySchedule(), now);
    expect(upcoming).toContain("Oggi");
    expect(upcoming).toContain("Domani");
    expect(upcoming).not.toContain("Ultimo mese");

    const past = answerQuestion(
      "Quali promemoria passati ho?",
      datedReminders,
      emptySchedule(),
      now,
    );
    expect(past).toContain("Ultimo mese");
    expect(past).not.toContain("Troppo vecchio");
    expect(past).not.toContain("Domani");
  });

  it("risponde sulle interrogazioni in agenda e sui docenti per materia", () => {
    const now = new Date(2026, 9, 26, 12);
    const interrogazioni: Interrogazione[] = [
      {
        id: "i1",
        subject: "Matematica",
        date: "2026-10-27",
        hour: 2,
        completed: false,
        checklist: [],
      },
      {
        id: "i2",
        subject: "Storia",
        date: "2026-10-20",
        completed: false,
        checklist: [],
      },
    ];
    expect(
      answerQuestion(
        "Quali sono le prossime interrogazioni?",
        data,
        emptySchedule(),
        now,
        interrogazioni,
      ),
    ).toContain("Matematica");

    saveClassTeachers([
      ["FASONE MARIANNA", "Inglese"],
      ["RAPISARDA VANESSA MANUELA", "Matematica"],
      ["FARACI ANNALISA", "Storia, Italiano"],
      ["MAROTTA SALVATORE", "Scienze integrate – Fisica"],
      ["GIAMMUSSO CLAUDIO STEFANO", "Laboratorio di fisica"],
      ["DI ROCCO ALICE", "Scienze integrate – Chimica"],
      ["ARDORE IVAN", "Laboratorio di chimica"],
      ["RIMMAUDO GIOVANNI", "Tecnologie e tecniche di rappresentazione grafica"],
      ["DI NOTO EMANUELE", "Laboratorio di disegno – TTRG"],
      ["NICASTRO EMANUEL", "Laboratorio di disegno – TTRG"],
    ]);

    const teacherData: VotoData = {
      ...data,
      subjects: data.subjects.map((subject) => ({ ...subject, teacher: "Prof.ssa Rossi" })),
    };
    expect(answerQuestion("Chi insegna Inglese?", teacherData)).toContain("Prof.ssa Rossi");
    expect(answerQuestion("Chi insegna Inglese?", data)).toContain("FASONE MARIANNA");
    expect(answerQuestion("Chi insegna Matematica?", data)).toContain("RAPISARDA VANESSA MANUELA");
    expect(answerQuestion("Chi insegna la Matematica?", data)).toContain(
      "RAPISARDA VANESSA MANUELA",
    );
    expect(answerQuestion("Chi insegna Storia?", data)).toContain("FARACI ANNALISA");
    const physics = answerQuestion("Chi insegna Fisica?", data);
    expect(physics).toContain("MAROTTA SALVATORE");
    expect(physics).not.toContain("GIAMMUSSO");
    const physicsLab = answerQuestion("Chi insegna Fisica lab?", data);
    expect(physicsLab).toContain("GIAMMUSSO CLAUDIO STEFANO");
    expect(physicsLab).not.toContain("MAROTTA");
    expect(answerQuestion("Chi insegna Laboratorio di fisica?", data)).toContain(
      "GIAMMUSSO CLAUDIO STEFANO",
    );
    const chemistry = answerQuestion("Chi insegna Chimica?", data);
    expect(chemistry).toContain("DI ROCCO ALICE");
    expect(chemistry).not.toContain("ARDORE");
    const chemistryLab = answerQuestion("Chi insegna Chimica lab?", data);
    expect(chemistryLab).toContain("ARDORE IVAN");
    expect(chemistryLab).not.toContain("DI ROCCO");
    expect(answerQuestion("Chi insegna Disegno tecnico?", data)).toContain("RIMMAUDO GIOVANNI");
    const drawingLab = answerQuestion("Chi insegna Laboratorio di disegno tecnico?", data);
    expect(drawingLab).toContain("DI NOTO EMANUELE");
    expect(drawingLab).toContain("NICASTRO EMANUEL");
    expect(drawingLab).not.toContain("RIMMAUDO");
    expect(answerQuestion("Quali sono i professori?", data)).toContain(
      "Docenti della sezione Professori",
    );
  });

  it("spiega materie sotto la sufficienza, andamento e ore residue di assenza", () => {
    const lowSubjectData: VotoData = {
      ...data,
      subjects: [
        ...data.subjects,
        {
          id: "latino",
          name: "Latino",
          grades: [
            { id: "g3", value: 5, label: "5", date: "2026-10-05", type: "orale", weight: 1 },
          ],
        },
      ],
    };
    expect(answerQuestion("Quali materie sono sotto il 6?", lowSubjectData)).toContain("Latino");
    expect(answerQuestion("Sto migliorando?", data)).toContain("stabile");
    expect(answerQuestion("Quanto mi manca al limite delle assenze?", data)).toContain(
      "ti restano 252,00 ore",
    );
    expect(answerQuestion("Quante ore di assenza ho?", data)).toContain("12,00 ore di assenza");
    expect(answerQuestion("Quante ore di assenza ho?", data)).toContain("con 1 ritardo");
  });

  it("consulta note e Diario con i campi presenti nei dati caricati", () => {
    const now = new Date(2026, 9, 27, 12);
    const schoolData: VotoData = {
      ...data,
      notifications: [
        {
          id: "note-1",
          type: "note",
          title: "Materiale dimenticato",
          message: "Mancava il quaderno",
          subject: "Inglese",
          date: "2026-10-27",
          read: false,
        },
        { id: "notice-1", type: "notice", title: "Assemblea", read: false },
      ],
      diary: [
        {
          id: "diary-1",
          date: "2026-10-27",
          subject: "Inglese",
          teacher: "Prof.ssa Rossi",
          hour: "2",
          activity: "Verifica dei vocaboli",
        },
      ],
    };

    const notes = answerQuestion("Quali note disciplinari ho?", schoolData, emptySchedule(), now);
    expect(notes).toContain("Materiale dimenticato");
    expect(notes).toContain("nuova");
    expect(notes).not.toContain("Assemblea");
    expect(
      answerQuestion("Cosa ho fatto oggi nel Diario?", schoolData, emptySchedule(), now),
    ).toContain("Verifica dei vocaboli");
  });

  it("consulta compiti completati e voti filtrati per materia e tipo", () => {
    const schoolData: VotoData = {
      ...data,
      assignments: [
        {
          id: "done-1",
          title: "Esercizi svolti",
          subject: "Inglese",
          dueDate: "2026-10-20",
          dueTime: "10:00",
          completed: true,
          details: "Unità 3",
        },
      ],
    };
    expect(answerQuestion("Quali compiti ho completato?", schoolData)).toContain("Unità 3");
    const grades = answerQuestion("Quali voti orali ho in Inglese?", data);
    expect(grades).toContain("orale");
    expect(grades).not.toContain("scritto");
  });

  it("riporta uscite anticipate, preferenze e stato di sincronizzazione senza scrivere dati", () => {
    const context = {
      source: "remote" as const,
      lastSync: "2026-10-27T08:30:00.000Z",
      hasRemoteUrl: true,
      target: 8.5,
      theme: "original",
      mode: "scuro",
      customFont: "sans",
      interfaceScale: 110,
      homeScale: 100,
      homeModules: [{ id: "note", enabled: true }],
    };
    expect(answerQuestion("Quante uscite anticipate ho?", data)).toContain("0 uscite anticipate");
    expect(
      answerQuestion("Qual è il mio obiettivo?", data, emptySchedule(), new Date(), [], context),
    ).toContain("8,50");
    expect(
      answerQuestion("Che tema sto usando?", data, emptySchedule(), new Date(), [], context),
    ).toContain("font Sans");
    expect(
      answerQuestion(
        "Qual è lo stato della sincronizzazione?",
        data,
        emptySchedule(),
        new Date(),
        [],
        context,
      ),
    ).toContain("sorgente remota configurata");
  });

  it("spiega cosa sa consultare e chiarisce che non invia giustificazioni", () => {
    expect(answerQuestion("Cosa sai fare?", data)).toContain("note");
    const justification = answerQuestion("Come giustifico un'assenza?", data);
    expect(justification).toContain("non inviare una giustificazione");
    expect(justification).toContain("DidUP Famiglia");
  });

  it("filtra notifiche di voto e promemoria non letti senza modificarne lo stato", () => {
    const now = new Date(2026, 9, 27, 12);
    const notificationData: VotoData = {
      ...data,
      notifications: [
        {
          id: "grade-notice",
          type: "grade",
          title: "Nuovo voto di Inglese",
          message: "È stato pubblicato un voto",
          subject: "Inglese",
          date: "2026-10-27",
          read: false,
        },
        {
          id: "reminder-read",
          type: "reminder",
          title: "Già letto",
          date: "2026-10-28",
          read: true,
        },
        {
          id: "reminder-unread",
          type: "reminder",
          title: "Da leggere",
          date: "2026-10-28",
          read: false,
        },
      ],
    };
    expect(
      answerQuestion("Quali notifiche di voto ho?", notificationData, emptySchedule(), now),
    ).toContain("Nuovo voto di Inglese");
    const reminders = answerQuestion(
      "Quali promemoria non letti ho?",
      notificationData,
      emptySchedule(),
      now,
    );
    expect(reminders).toContain("Da leggere");
    expect(reminders).not.toContain("Già letto");
  });

  it("consulta lo storico interrogazioni e la checklist senza spuntarla", () => {
    const now = new Date(2026, 9, 27, 12);
    const agenda: Interrogazione[] = [
      {
        id: "past",
        subject: "Storia",
        date: "2026-10-20",
        completed: true,
        checklist: [],
      },
      {
        id: "future",
        subject: "Inglese",
        date: "2026-10-29",
        completed: false,
        checklist: [
          { id: "appunti", label: "Ripassare gli appunti", done: true },
          { id: "argomenti", label: "Studiare gli argomenti", done: false },
        ],
      },
    ];
    expect(
      answerQuestion("Quali interrogazioni ho completato?", data, emptySchedule(), now, agenda),
    ).toContain("Storia");
    const preparation = answerQuestion(
      "Cosa devo preparare per la prossima interrogazione?",
      data,
      emptySchedule(),
      now,
      agenda,
    );
    expect(preparation).toContain("Fatto: Ripassare gli appunti");
    expect(preparation).toContain("Da fare: Studiare gli argomenti");
    expect(preparation).toContain("non modifica la checklist");
  });

  it("riassume in un solo messaggio orario, compiti, diario, interrogazioni e promemoria", () => {
    const now = new Date(2026, 9, 27, 12);
    const tomorrowData: VotoData = {
      ...data,
      assignments: [{ id: "a-tomorrow", title: "Tema", dueDate: "2026-10-28", completed: false }],
      diary: [
        { id: "d-tomorrow", date: "2026-10-28", subject: "Italiano", activity: "Consegna tema" },
      ],
      notifications: [
        {
          id: "r-tomorrow",
          type: "reminder",
          title: "Portare il libro",
          date: "2026-10-28",
          read: false,
        },
      ],
    };
    const schedule = emptySchedule();
    schedule.mercoledi[0] = "Storia";
    const agenda: Interrogazione[] = [
      {
        id: "i-tomorrow",
        subject: "Matematica",
        date: "2026-10-28",
        completed: false,
        checklist: [],
      },
    ];

    const summary = answerQuestion(
      "Fammi il riepilogo di domani",
      tomorrowData,
      schedule,
      now,
      agenda,
    );
    expect(summary).toContain("Storia");
    expect(summary).toContain("Tema");
    expect(summary).toContain("Consegna tema");
    expect(summary).toContain("Matematica");
    expect(summary).toContain("Portare il libro");
  });

  it("consulta profilo e strumenti Studio Lab senza inventare dati", () => {
    const profileData: VotoData = {
      ...data,
      student: { name: "Giulia", className: "2A", schoolYear: "2026/2027" },
    };
    const context = {
      flashcards: [
        { id: "card-1", subject: "Inglese", question: "Come si dice mela?", answer: "Apple" },
      ],
      pomodoro: { mode: "focus", seconds: 90, running: true, completed: 2 },
    };
    expect(answerQuestion("In che classe sono?", profileData)).toContain("2A");
    expect(answerQuestion("In che classe sono?", profileData)).toContain("Giulia");
    expect(
      answerQuestion(
        "Mostrami le risposte delle flashcard di Inglese",
        data,
        emptySchedule(),
        new Date(),
        [],
        context,
      ),
    ).toContain("Apple");
    expect(
      answerQuestion(
        "Quante sessioni Pomodoro ho completato?",
        data,
        emptySchedule(),
        new Date(),
        [],
        context,
      ),
    ).toContain("completato 2 sessioni");
    expect(answerQuestion("Dove trovo il simulatore?", data)).toContain(
      "Studio Lab > Calcolo media e simulatore voti",
    );
  });

  it("spiega che Oro e Diamante sono già selezionabili nella personalizzazione", () => {
    expect(answerQuestion("Come sblocco il tema Diamante?", data)).toContain(
      "sono già selezionabili",
    );
    expect(answerQuestion("Dove trovo il tema Oro?", data)).toContain(
      "Personalizza > Temi > Altri temi",
    );
  });

  it("mostra due suggerimenti casuali distinti, entrambi supportati", () => {
    const first = pickAssistantSuggestions(() => 0);
    const second = pickAssistantSuggestions(() => 0.99);

    expect(first).toHaveLength(2);
    expect(new Set(first).size).toBe(2);
    expect(second).toHaveLength(2);
    expect(new Set(second).size).toBe(2);
    expect(second).not.toEqual(first);
    for (const suggestion of [...first, ...second]) {
      expect(answerQuestion(suggestion, data)).not.toContain("Non ho capito la domanda");
    }
  });
});
