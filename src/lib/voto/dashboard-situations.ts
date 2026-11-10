import { fmt } from "./calc";
import type { Interrogazione } from "./interrogazioni";
import type { Attendance } from "./types";

function pick<T>(items: T[], seed: number): T {
  const safeSeed = Number.isFinite(seed) ? Math.min(Math.max(seed, 0), 0.999999) : 0;
  return items[Math.floor(safeSeed * items.length)]!;
}

export function attendanceMicrocopy(attendance: Attendance, seed: number): string {
  const hours = Math.max(0, attendance.absenceHours);
  const days = Math.max(0, attendance.absenceDays);
  const limit = Math.max(0, attendance.absenceLimitHours);
  const remaining = Math.max(0, limit - hours);

  if (limit > 0 && hours > limit) {
    return pick(
      [
        "Il limite di ore d’assenza risulta superato: controlla il conteggio con la scuola.",
        "La soglia delle assenze è stata superata. Meglio verificare insieme alla famiglia o alla scuola.",
        "Il contatore è oltre il limite: niente panico, ma è il momento di fare il punto.",
      ],
      seed,
    );
  }

  if (limit > 0 && hours >= limit * 0.8) {
    return pick(
      [
        `Ti restano ${fmt(remaining, 1)} ore prima del limite: tieni d’occhio il contatore.`,
        `Sei vicino alla soglia: restano ${fmt(remaining, 1)} ore disponibili.`,
        `Il limite si avvicina: controlla le assenze e considera che restano ${fmt(remaining, 1)} ore.`,
      ],
      seed,
    );
  }

  if (hours === 0 && days === 0) {
    return pick(
      [
        "Nei dati sincronizzati non risultano assenze: il contatore oggi è tranquillo.",
        "Zero ore di assenza registrate nei dati caricati: il registro è stato puntuale.",
        "Per ora il conteggio delle assenze è a zero. La campanella ti ha trovato in orario!",
      ],
      seed,
    );
  }

  return pick(
    [
      `Risultano ${fmt(days, 0)} giorni d’assenza (${fmt(hours, 1)} ore): il conteggio è quello sincronizzato dal registro.`,
      `Il registro riporta ${fmt(hours, 1)} ore di assenza. L’eventuale stato di giustificazione compare solo se è presente nei dati sincronizzati.`,
      `Hai ${fmt(days, 0)} giorni d’assenza registrati: per la giustificazione fa fede solo lo stato ricevuto dal registro.`,
    ],
    seed,
  );
}

export function notesMicrocopy(total: number, unread: number, seed: number): string {
  if (unread > 0) {
    return pick(
      [
        unread === 1
          ? "Hai una nota da leggere: aprila prima che diventi una sorpresa."
          : `Hai ${unread} note da leggere: una alla volta, senza allarmismi.`,
        unread === 1
          ? "C’è una nota nuova nel registro: dai un’occhiata con calma."
          : `Ci sono ${unread} note nuove da controllare: detective del registro, tocca a te.`,
        unread === 1
          ? "Il registro ha lasciato una nota in sospeso."
          : `Il registro ha lasciato ${unread} note in sospeso: meglio leggerle.`,
      ],
      seed,
    );
  }

  if (total > 0) {
    return pick(
      [
        `Nessuna nota nuova: le ${total} note caricate risultano già lette.`,
        `Sezione Note in pari: ${total} ${total === 1 ? "nota già consultata" : "note già consultate"}.`,
        "Tutto letto qui: nessun post-it in sospeso.",
      ],
      seed,
    );
  }

  return pick(
    [
      "Nei dati sincronizzati non risultano note: per ora niente post-it dal registro.",
      "Nessuna nota caricata: sezione tranquilla, puoi continuare la giornata.",
      "Qui non ci sono note da leggere. Il registro oggi è silenzioso.",
    ],
    seed,
  );
}

export function bulletinMicrocopy(total: number, unread: number, seed: number): string {
  if (unread > 0) {
    return pick(
      [
        unread === 1
          ? "C’è una comunicazione o circolare non letta: aprila per i dettagli."
          : `Ci sono ${unread} comunicazioni o circolari da leggere: la bacheca ha novità.`,
        unread === 1
          ? "La Bacheca ha una novità in attesa: serve un’occhiata."
          : `La Bacheca ha ${unread} novità da controllare: niente caccia al tesoro, sono qui.`,
        unread === 1
          ? "Una comunicazione è ancora da leggere: meglio non lasciarla in sospeso."
          : `${unread} comunicazioni sono ancora da leggere: scegli da quale cominciare.`,
      ],
      seed,
    );
  }

  if (total > 0) {
    return pick(
      [
        `Bacheca in pari: tutte le ${total} comunicazioni caricate risultano lette.`,
        `Hai già consultato le ${total} comunicazioni in Bacheca: per ora nessun avviso in sospeso.`,
        "Tutto letto in Bacheca. La prossima circolare non ti coglierà impreparato.",
      ],
      seed,
    );
  }

  return pick(
    [
      "Nei dati sincronizzati non risultano comunicazioni o circolari nuove.",
      "La Bacheca è tranquilla: nessun avviso caricato per ora.",
      "Nessuna comunicazione in Bacheca. Oggi il megafono riposa.",
    ],
    seed,
  );
}

export function interrogazioniMicrocopy(items: Interrogazione[], seed: number): string {
  const open = items.filter((item) => !item.completed);
  if (open.length === 0) {
    return pick(
      [
        "Nessuna interrogazione aperta: oggi la suspense può aspettare.",
        "Per ora non hai interrogazioni da preparare. Goditi la tregua!",
        "Agenda libera da interrogazioni aperte: un raro momento di pace scolastica.",
      ],
      seed,
    );
  }

  const withoutDate = open.filter((item) => !item.date.trim()).length;
  if (withoutDate === open.length) {
    return pick(
      [
        open.length === 1
          ? "Hai un’interrogazione da preparare ma senza data: aggiungila all’agenda."
          : `Hai ${open.length} interrogazioni aperte senza data: organizza il calendario del ripasso.`,
        open.length === 1
          ? "Una materia ti aspetta, ma manca la data: completa l’agenda e pianifica il ripasso."
          : `${open.length} interrogazioni senza data: prima si fissa il quando, poi si ripassa il cosa.`,
      ],
      seed,
    );
  }

  if (withoutDate > 0) {
    return pick(
      [
        `Hai ${open.length} interrogazioni aperte; ${withoutDate} ${withoutDate === 1 ? "è senza data" : "sono senza data"}.`,
        `${open.length} interrogazioni da preparare: ${withoutDate} ${withoutDate === 1 ? "data da definire" : "date da definire"}.`,
      ],
      seed,
    );
  }

  return pick(
    [
      open.length === 1
        ? "Hai un’interrogazione in agenda: un po’ di ripasso oggi, più tranquillità domani."
        : `Hai ${open.length} interrogazioni in agenda: affrontale una alla volta.`,
      open.length === 1
        ? "Una materia ti aspetta all’orale: prepara gli appunti e vai con calma."
        : `${open.length} interrogazioni aperte: organizza il ripasso e non ridurti all’ultima sera.`,
      open.length === 1
        ? "Interrogazione in programma: il te di domani ringrazierà quello di oggi per il ripasso."
        : `Il calendario segnala ${open.length} interrogazioni: meglio un piano che una maratona.`,
    ],
    seed,
  );
}
