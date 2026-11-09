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
  it("spiega i messaggi generici delle notifiche ntfy", () => {
    const answer = answerQuestion("Perché ntfy mostra un testo diverso?", data);

    expect(answer).toContain("Ci sono novità in bacheca");
    expect(answer).toContain("Ci sono novità nei voti");
    expect(answer).toContain("Ci sono novità nei compiti");
    expect(answer).toContain("apri la sezione corrispondente in VOTO");
  });

  it("indirizza alle pagelle e chiarisce che i riepiloghi non sono ufficiali", () => {
    expect(answerQuestion("Dove trovo la pagella finale?", data)).toContain(
      "Menu > Scrutini infraperiodali",
    );
    expect(answerQuestion("La pagella finale è ufficiale?", data)).toContain(
      "non sono valutazioni ufficiali",
    );
    expect(answerQuestion("Cosa sai fare?", data)).toContain("riepiloghi indicativi delle pagelle");
  });

  it("consulta la sintesi locale del regolamento scolastico con l’avvertenza sull’anno", () => {
    const phoneRule = answerQuestion("Posso usare il cellulare in classe?", data);
    expect(phoneRule).toContain("è vietato agli studenti portare il cellulare");
    expect(phoneRule).toContain("A.S. 2025/26");
    expect(phoneRule).toContain("Verifica eventuali aggiornamenti.");
    expect(phoneRule).not.toContain("Il documento è dell’anno scolastico precedente");
    expect(answerQuestion("Come giustifico un'assenza?", data)).toContain(
      "giustificata tempestivamente",
    );
    expect(answerQuestion("Qual è la regola sulla frequenza?", data)).toContain(
      "almeno tre quarti",
    );
    expect(answerQuestion("Qual è la fonte del regolamento?", data)).toContain("A.S. 2025/26");
    expect(answerQuestion("Quali sono i diritti e i doveri degli alunni?", data)).toContain(
      "formazione qualificata",
    );
    expect(answerQuestion("Quali sono i diritti e i doveri degli alunni?", data)).toContain(
      "frequentare regolarmente",
    );
  });

  it("collega un follow-up temporale alla domanda precedente", () => {
    const followUpData: VotoData = {
      ...data,
      assignments: [{ id: "tomorrow", title: "Ripasso", dueDate: "2026-10-27", completed: false }],
    };
    expect(
      answerQuestion("e domani?", followUpData, emptySchedule(), new Date(2026, 9, 26, 12), [], {
        previousQuestion: "Quali compiti ho?",
      }),
    ).toContain("Ripasso");
  });

  it("cerca nel testo completo quando la domanda riguarda una sezione meno comune", () => {
    const answer = answerQuestion(
      "Come funziona il Consiglio d’Istituto secondo il regolamento?",
      data,
    );
    expect(answer).toContain("testo completo del regolamento");
    expect(answer).toContain("p.");
  });

  it("interpreta sinonimi colloquiali nelle domande sul regolamento", () => {
    expect(answerQuestion("Dove lavora il bidello secondo il regolamento?", data)).toContain(
      "testo completo del regolamento",
    );
    expect(answerQuestion("Quali regole valgono per una gita scolastica?", data)).toContain(
      "due terzi",
    );
  });

  it("mostra gli argomenti disponibili e accetta un riferimento a una pagina", () => {
    expect(answerQuestion("Quali argomenti contiene il regolamento?", data)).toContain(
      "cellulari, smartphone e dispositivi elettronici",
    );
    expect(answerQuestion("Cosa dice il regolamento a pagina 25?", data)).toContain("p. 25");
  });

  it("risponde sugli articoli pratici non ancora coperti della vita scolastica", () => {
    expect(answerQuestion("A che ora posso entrare a scuola?", data)).toContain("7:30");
    expect(answerQuestion("A che ora posso entrare a scuola?", data)).toContain("art. 18.1–18.2");
    expect(answerQuestion("Posso andare in bagno durante la ricreazione?", data)).toContain(
      "Non è consentito andarci durante gli intervalli",
    );
    expect(answerQuestion("Dove posso comprare merenda?", data)).toContain("7:45–8:00");
    expect(answerQuestion("Come si richiede un’assemblea di classe?", data)).toContain(
      "almeno 5 giorni prima",
    );
    expect(answerQuestion("Quali regole valgono per le gite scolastiche?", data)).toContain(
      "due terzi della classe",
    );
    expect(answerQuestion("L’uscita didattica di un giorno è obbligatoria?", data)).toContain(
      "partecipazione dell’intera classe",
    );
    expect(answerQuestion("Chi può usare l’ascensore?", data)).toContain(
      "accompagnati da un collaboratore scolastico",
    );
    expect(
      answerQuestion("Come si possono usare gli spazi della scuola fuori orario?", data),
    ).toContain("autorizzazione del Dirigente");
    expect(answerQuestion("Posso svapare a scuola?", data)).toContain("art. 33");
    expect(answerQuestion("Cosa succede se danneggio un banco?", data)).toContain(
      "art. 29 e art. 30",
    );
    expect(answerQuestion("Quali regole ci sono per i farmaci a scuola?", data)).toContain(
      "autorizzazione scritta",
    );
    expect(answerQuestion("Come faccio ricorso contro una sospensione?", data)).toContain(
      "entro 15 giorni",
    );
  });

  it("capisce domande colloquiali su un infortunio e sull’uso dell’ascensore", () => {
    const injury = answerQuestion("Cosa accade se mi faccio male?", data);
    expect(injury).toContain("primo soccorso");
    expect(injury).toContain("118");
    expect(injury).toContain("art. 35");
    expect(answerQuestion("Cosa acacde se mi faccio male?", data)).toContain("primo soccorso");

    const hurtAtSchool = answerQuestion("A chi mi rivolgo se mi faccio male a scuola?", data);
    expect(hurtAtSchool).toContain("avvisa subito un docente");

    const elevator = answerQuestion("Posso usare l’ascensore?", data);
    expect(elevator).toContain("difficoltà di deambulazione");
    expect(elevator).toContain("accompagnati da un collaboratore scolastico");
    expect(answerQuestion("Posso usare ascensore?", data)).toContain(
      "accompagnati da un collaboratore scolastico",
    );
  });

  it("capisce domande colloquiali su assenze, ritardi, uscite e danni", () => {
    const attendance = answerQuestion("Quante assenze posso fare prima di perdere l’anno?", data);
    expect(attendance).toContain("Non c’è un numero fisso di giorni di assenza uguale per tutti");
    expect(attendance).toContain("tre quarti");

    expect(answerQuestion("Quanti ritardi posso fare?", data)).toContain("dopo tre ritardi brevi");
    expect(answerQuestion("Posso andare via prima da scuola?", data)).toContain(
      "preannunciata dal genitore",
    );
    expect(answerQuestion("Se rompo qualcosa a scuola cosa rischio?", data)).toContain(
      "danni alle strutture o alle dotazioni",
    );
  });

  it("non confonde domande sui voti o sulle note personali con il regolamento", () => {
    expect(answerQuestion("Cosa succede se prendo 8 in Inglese?", data)).toContain("passerebbe");
    expect(answerQuestion("Quali note disciplinari ho?", data)).toContain(
      "Non risultano note disciplinari nei dati caricati",
    );
  });

  it("calcola il voto necessario per una materia e un obiettivo", () => {
    expect(answerQuestion("Quanto devo prendere in Inglese per arrivare a 8?", data)).toContain(
      "almeno 10",
    );
  });

  it("riconosce abbreviazioni e piccoli errori nel nome della materia", () => {
    expect(answerQuestion("Che media ho in ing?", data)).toContain("Inglese");
    expect(answerQuestion("Quanto devo prendere in ingese per puntare a 8?", data)).toContain(
      "almeno 10",
    );
  });

  it("risponde su media generale, compiti e assenze", () => {
    expect(answerQuestion("Qual è la mia media generale?", data)).toContain("7,00");
    expect(answerQuestion("Quanti compiti devo fare?", data)).toContain("1 compito");
    expect(answerQuestion("Quante assenze ho?", data)).toContain("2 giorni");
  });

  it("legge le date degli eventi e indica la nuova schermata personalizzata", () => {
    const eventsData: VotoData = {
      ...data,
      attendanceEvents: [
        { id: "a-1", type: "absence", date: "2026-10-26" },
        { id: "a-2", type: "absence", date: "2026-10-18", justificationStatus: "Giustificata" },
        { id: "r-1", type: "delay", date: "2026-10-12" },
      ],
    };
    expect(answerQuestion("In quali giorni sono stato assente?", eventsData)).toContain(
      "26/10/2026, 18/10/2026",
    );
    expect(answerQuestion("Mostrami tutti gli eventi", eventsData)).toContain(
      "Altro > Assenze > Tutti gli eventi",
    );
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

  it("cerca nei testi estratti delle circolari dettagli su classi e orari", () => {
    const noticeData: VotoData = {
      ...data,
      notifications: [
        {
          id: "assemblea-1",
          type: "notice",
          title: "Assemblea d’istituto",
          date: "2026-11-05",
          extractedText: "L’assemblea riguarda la classe 2I. Gli studenti della 2I escono alle ore 12:30.",
          read: false,
        },
      ],
    };
    const answer = answerQuestion("A che ora esce la 2I per l’assemblea?", noticeData);
    expect(answer).toContain("12:30");
    expect(answer).toContain("Assemblea d’istituto");
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

  it("separa le novità di bacheca, voti e compiti dal riepilogo generale", () => {
    const now = new Date(2026, 9, 27, 12);
    const updatesData: VotoData = {
      ...data,
      assignments: [
        { id: "new-task", title: "Relazione di storia", dueDate: "2026-10-30", completed: false },
      ],
      notifications: [
        {
          id: "new-notice",
          type: "notice",
          title: "Comunicazione di bacheca",
          date: "2026-10-27",
          read: false,
        },
      ],
    };

    const bulletin = answerQuestion(
      "Ci sono novità in bacheca?",
      updatesData,
      emptySchedule(),
      now,
    );
    expect(bulletin).toContain("Comunicazione di bacheca");
    expect(bulletin).not.toContain("Ultimo voto");

    const grades = answerQuestion("Ci sono novità nei voti?", updatesData, emptySchedule(), now);
    expect(grades).toContain("Voti registrati");
    expect(grades).toContain("Inglese");
    expect(grades).not.toContain("Comunicazione di bacheca");

    const assignments = answerQuestion(
      "Ci sono novità nei compiti?",
      updatesData,
      emptySchedule(),
      now,
    );
    expect(assignments).toContain("Relazione di storia");
    expect(assignments).not.toContain("Ultimo voto");
    expect(assignments).not.toContain("Comunicazione di bacheca");

    const overview = answerQuestion("Quali sono le novità?", updatesData, emptySchedule(), now);
    expect(overview).toContain("Ultimo voto");
    expect(overview).toContain("Comunicazione di bacheca");
  });

  it("non presenta un promemoria senza data come prossimo", () => {
    const noDateReminderData: VotoData = {
      ...data,
      notifications: [
        { id: "undated", type: "reminder", title: "Promemoria senza data", read: false },
      ],
    };
    const summary = answerQuestion(
      "Quali sono le novità?",
      noDateReminderData,
      emptySchedule(),
      new Date(2026, 9, 27, 12),
    );
    expect(summary).not.toContain("Promemoria: Promemoria senza data");
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

  it("interpreta ieri e dopodomani come date precise nei riepiloghi e nei promemoria", () => {
    const now = new Date(2026, 9, 27, 12);
    const datedData: VotoData = {
      ...data,
      assignments: [
        { id: "yesterday-task", title: "Consegna ieri", dueDate: "2026-10-26", completed: false },
        { id: "tomorrow-task", title: "Consegna domani", dueDate: "2026-10-28", completed: false },
        { id: "after-task", title: "Verifica dopodomani", dueDate: "2026-10-29", completed: false },
      ],
      notifications: [
        {
          id: "yesterday-reminder",
          type: "reminder",
          title: "Promemoria ieri",
          date: "2026-10-26",
          read: false,
        },
        {
          id: "after-reminder",
          type: "reminder",
          title: "Promemoria dopo",
          date: "2026-10-29",
          read: false,
        },
      ],
    };

    expect(answerQuestion("Quali promemoria ho ieri?", datedData, emptySchedule(), now)).toContain(
      "Promemoria ieri",
    );
    const overview = answerQuestion(
      "Fammi il riepilogo di dopodomani",
      datedData,
      emptySchedule(),
      now,
    );
    expect(overview).toContain("Verifica dopodomani");
    expect(overview).not.toContain("Consegna domani");
    expect(overview).toContain("Promemoria dopo");
    const dueTasks = answerQuestion(
      "Quali compiti scadono dopodomani?",
      datedData,
      emptySchedule(),
      now,
    );
    expect(dueTasks).toContain("Verifica dopodomani");
    expect(dueTasks).not.toContain("Consegna domani");
  });

  it("non trasforma una richiesta informativa sui compiti completati in un comando", () => {
    const completedData: VotoData = {
      ...data,
      assignments: [{ id: "done", title: "Esercizi svolti", completed: true }],
    };
    expect(answerQuestion("Quali compiti ho completato?", completedData)).toContain(
      "Esercizi svolti",
    );
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
          date: "2026-08-27",
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
    expect(notes).toContain("non letta");
    expect(notes).not.toContain("nuova");
    expect(notes).not.toContain("Assemblea");
    expect(
      answerQuestion("Cosa ho fatto oggi nel Diario?", schoolData, emptySchedule(), now),
    ).toContain("Verifica dei vocaboli");
    expect(
      answerQuestion("Quali note non lette ho ieri?", schoolData, emptySchedule(), now),
    ).toContain("per ieri");
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
    };
    expect(answerQuestion("In che classe sono?", profileData)).toContain("2A");
    expect(answerQuestion("In che classe sono?", profileData)).toContain("Giulia");
    expect(answerQuestion("In che anno scolastico sono?", profileData)).toContain("2026/2027");
    const schoolStart = answerQuestion("Quando inizia l’anno scolastico?", profileData);
    expect(schoolStart).toContain("non è indicata la data di inizio");
    expect(schoolStart).not.toContain("2026/2027");
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
      answerQuestion("Dove trovo il simulatore per calcolare il voto necessario?", data),
    ).toContain("Studio Lab > Calcolo media e simulatore voti");
  });

  it("calcola i giorni alla fine delle lezioni usando solo la data locale configurata", () => {
    const now = new Date(2026, 0, 1, 12);
    const configured = answerQuestion("Quando finirà la scuola?", data, emptySchedule(), now, [], {
      schoolEndDate: "2026-06-08",
    });
    expect(configured).toContain("08/06/2026");
    expect(configured).toContain("giorni di lezione");
    expect(configured).toContain("weekend e festività esclusi");

    const missing = answerQuestion("Quando finisce la scuola?", data, emptySchedule(), now);
    expect(missing).toContain("Studio Lab > Fine scuola");

    const lastDay = answerQuestion(
      "Qual è l’ultimo giorno di scuola?",
      data,
      emptySchedule(),
      new Date(2026, 5, 8, 12),
      [],
      { schoolEndDate: "2026-06-08" },
    );
    expect(lastDay).toContain("Oggi");

    const passedDate = answerQuestion(
      "Quanti giorni mancano alla fine delle lezioni?",
      data,
      emptySchedule(),
      new Date(2026, 5, 10, 12),
      [],
      { schoolEndDate: "2026-06-08" },
    );
    expect(passedDate).toContain("è passata da 2 giorni");
  });

  it("spiega che Oro, Diamante e Sangue sono già selezionabili nella personalizzazione", () => {
    expect(answerQuestion("Come sblocco il tema Diamante?", data)).toContain(
      "sono già selezionabili",
    );
    expect(answerQuestion("Dove trovo il tema Oro?", data)).toContain("Personalizza > Temi");
    expect(answerQuestion("Come sblocco il tema Sangue?", data)).toContain("Diamante e Sangue");
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

  it("descrive le azioni sui compiti come disponibili solo dopo conferma", () => {
    const capabilities = answerQuestion("Cosa sai fare?", data);
    expect(capabilities).toContain("Dopo la tua conferma");
    expect(capabilities).toContain("segnare un compito come completato o riaprirlo");
  });
});
it("calcola localmente il margine e simula ore aggiuntive di assenza", () => {
  const absenceData: VotoData = {
    ...data,
    attendance: { ...data.attendance, absenceHours: 12, absenceLimitHours: 30, annualHours: 120 },
  };
  const now = new Date(2026, 9, 27, 12);
  const context = { absenceHoursPerDay: 4 };
  const remaining = answerQuestion(
    "Quante giornate intere di assenza mi restano prima del limite?",
    absenceData,
    emptySchedule(),
    now,
    [],
    context,
  );
  expect(remaining).toContain("restano 18,00 ore");
  expect(remaining).toContain("4 giornate intere");

  const simulation = answerQuestion(
    "Se aggiungo 5 ore di assenza, cosa succede?",
    absenceData,
    emptySchedule(),
    now,
    [],
    context,
  );
  expect(simulation).toContain("arriveresti a 17,00 ore");
  expect(simulation).toContain("resterebbero 13,00 ore");
  expect(simulation).toContain("3 giornate intere residue");

  const noLimitData: VotoData = {
    ...absenceData,
    attendance: { ...absenceData.attendance, absenceLimitHours: 0 },
  };
  expect(answerQuestion("Quanto mi manca al limite delle assenze?", noLimitData)).toContain(
    "non è impostato un limite valido",
  );
});
