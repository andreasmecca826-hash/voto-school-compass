const SUGGESTIONS = [
  "Qual è la mia media generale?",
  "Quanto devo prendere in Inglese per arrivare a 8?",
  "Quali compiti scadono domani?",
  "Che lezioni ho oggi?",
  "Qual è l’ultimo voto?",
  "Quali sono le novità?",
  "Quali promemoria ho?",
  "Chi insegna Inglese?",
  "Quanto mi manca al limite delle assenze?",
  "Quali sono le prossime interrogazioni?",
  "Quali materie sono sotto il 6?",
  "Quali note disciplinari ho?",
  "Cosa ho fatto oggi nel Diario?",
  "Quali compiti ho completato?",
  "Che tema sto usando?",
  "Quali notifiche di voto ho?",
  "Cosa devo preparare per la prossima interrogazione?",
  "Fammi un riepilogo di oggi.",
  "Quante flashcard ho nella sessione?",
  "Quanto manca al Pomodoro?",
  "Dove trovo il simulatore dei voti?",
  "Come scelgo il tema Oro?",
  "Dove trovo il tema Diamante?",
];

export function pickAssistantSuggestions(random: () => number = Math.random): string[] {
  const remaining = [...SUGGESTIONS];
  const picked: string[] = [];

  while (picked.length < 2 && remaining.length > 0) {
    const index = Math.min(remaining.length - 1, Math.floor(random() * remaining.length));
    picked.push(remaining.splice(index, 1)[0]!);
  }

  return picked;
}
