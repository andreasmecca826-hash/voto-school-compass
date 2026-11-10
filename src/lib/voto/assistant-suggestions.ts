const SUGGESTIONS = [
  "Qual è la mia media generale?",
  "Quanto devo prendere in Inglese per arrivare a 8?",
  "Quali materie hanno la media più bassa?",
  "Qual è il mio voto più alto?",
  "Qual è l’ultimo voto ricevuto?",
  "Quali compiti scadono domani?",
  "Quali compiti sono già scaduti?",
  "Quali compiti ho ancora da fare?",
  "Quali compiti ho completato?",
  "Che lezioni ho oggi?",
  "Che lezioni ho domani?",
  "Qual è la prossima lezione?",
  "Quali sono le prossime interrogazioni?",
  "Quali interrogazioni ho questa settimana?",
  "Quali verifiche ho in programma?",
  "Cosa devo preparare per la prossima interrogazione?",
  "Quali promemoria ho?",
  "Quali promemoria ho domani?",
  "Quali promemoria non ho ancora letto?",
  "Quali note disciplinari ho?",
  "Quali note recenti ho ricevuto?",
  "Cosa ho fatto oggi nel Diario?",
  "Cosa ho nel Diario domani?",
  "Chi insegna Inglese?",
  "Quali docenti ho?",
  "Quante assenze ho?",
  "Quanti ritardi ho?",
  "Quanto mi manca al limite delle assenze?",
  "Se aggiungo 5 ore di assenza, cosa succede?",
  "Quando finisce la scuola?",
  "Fammi un riepilogo di oggi.",
  "Fammi un riepilogo di domani.",
  "Quali sono le novità?",
  "Cerca algebra nei miei dati.",
  "Cerca una circolare sull’uscita didattica.",
  "Cerca una verifica di matematica.",
  "Cosa dice l’ultima circolare?",
  "Qual è la scadenza indicata nell’ultima circolare?",
  "A chi è rivolta l’ultima circolare?",
  "Quante flashcard ho nella sessione?",
  "Mostrami le flashcard di Inglese.",
  "Cosa devo studiare questa settimana?",
  "Dove trovo il simulatore dei voti?",
  "Che tema sto usando?",
  "Come scelgo il tema Oro?",
  "Dove trovo il tema Diamante?",
  "Quanti minuti di ritardo sono ammessi?",
  "Quando si può andare in bagno?",
  "Come si richiede un’assemblea di classe?",
  "Cosa contiene il regolamento?",
  "Cosa dice il regolamento a pagina 25?",
  "Dove trovo la pagella infraperiodale?",
  "Qual è lo stato della sincronizzazione?",
] as const;

function suggestionKey(value: string): string {
  return value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function pickAssistantSuggestions(random: () => number = Math.random): string[] {
  const unique = new Map<string, string>();
  for (const suggestion of SUGGESTIONS) unique.set(suggestionKey(suggestion), suggestion);
  const remaining = [...unique.values()];
  const picked: string[] = [];

  while (picked.length < 4 && remaining.length > 0) {
    const rawIndex = Math.floor(random() * remaining.length);
    const index = Math.max(0, Math.min(remaining.length - 1, rawIndex));
    picked.push(remaining.splice(index, 1)[0]!);
  }

  return picked;
}
