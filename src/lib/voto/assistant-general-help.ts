import { answerSchoolAdministrativeInfo } from "./school-administrative-info";

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

const STUDY_METHOD_ANSWER =
  "Un metodo semplice da provare: scegli un obiettivo piccolo dai materiali assegnati; studia un blocco breve; chiudi gli appunti e prova a spiegare o ricordare i concetti; correggi gli errori con esempi o esercizi; riprendi gli stessi punti dopo un giorno e poi dopo alcuni giorni. Alterna lavoro e pause e chiedi al docente di chiarire ciò che resta dubbio. In VOTO puoi usare Flashcard e Planner di studio, scegliendo tu cosa e quando ripassare. Sono indicazioni generali: per programma e priorità fa fede il docente.";

const EXAM_PREPARATION_ANSWER =
  "Per preparare una verifica o un’interrogazione: controlla programma e criteri indicati dal docente; dividi gli argomenti in parti gestibili; per ogni parte prova a richiamare le idee senza guardare gli appunti; fai esercizi per le materie pratiche oppure esponi ad alta voce per quelle orali; alla fine rivedi gli errori e i punti ancora incerti. In VOTO puoi segnare sessioni nel Planner o creare Flashcard, ma sei tu a scegliere gli argomenti: non ricavo il programma dal registro.";

export function answerGeneralSchoolHelp(question: string): string | null {
  const normalized = normalize(question);
  if (!normalized) return null;

  const administrativeInfo = answerSchoolAdministrativeInfo(question);
  if (administrativeInfo) return administrativeInfo;

  if (/^(ciao|salve|buongiorno|buonasera|ehi)$/.test(normalized)) {
    return "Ciao! Posso aiutarti offline con i dati e le funzioni di VOTO, spiegare alcuni calcoli e darti indicazioni generali sul metodo di studio.";
  }
  if (/^(grazie|grazie mille|ok grazie)$/.test(normalized)) {
    return "Di nulla! Se vuoi, chiedimi dei dati di VOTO, di come viene calcolata la media o di un metodo per studiare.";
  }

  const asksNoticeDefinition =
    (normalized.includes("circolar") &&
      normalized.includes("comunicaz") &&
      includesAny(normalized, [
        "differenz",
        "distingu",
        "confront",
        "cosa sono",
        "che cosa sono",
      ])) ||
    ((normalized.includes("cosa sono") || normalized.includes("che cosa sono")) &&
      includesAny(normalized, ["circolar", "comunicaz"]));
  if (asksNoticeDefinition) {
    return "In VOTO, nella sezione Novità, le Circolari sono gli avvisi di bacheca con un allegato riconosciuto (per esempio PDF o DOCX); le Comunicazioni sono gli avvisi di testo senza un allegato associato. La distinzione dipende dai dati sincronizzati: se un allegato risulta mancante o non si apre, va verificato come file, non considerato automaticamente testo vuoto.";
  }

  const asksAverageExplanation =
    normalized.includes("media ponderata") ||
    normalized.includes("media aritmetica") ||
    (normalized.includes("media") &&
      includesAny(normalized, [
        "come si calcola",
        "come viene calcolata",
        "come calcola voto",
        "formula della",
        "spiegami la",
        "significa media",
      ]));
  const asksForPersonalAverage =
    normalized.includes("mia media") ||
    normalized.includes("quanto ho di media") ||
    normalized.includes("qual e la mia media");
  if (asksAverageExplanation && !asksForPersonalAverage) {
    return "In VOTO la media di una materia è ponderata con i pesi dei voti registrati (un peso mancante o non valido viene trattato come 1). La media generale è poi la media semplice delle medie delle materie che hanno almeno un voto: non è la media di tutti i voti sommati insieme. Il risultato dipende dai dati sincronizzati e non è una previsione né una valutazione ufficiale.";
  }

  const asksGradeThreshold =
    normalized.includes("voto sufficiente") ||
    normalized.includes("voto e sufficiente") ||
    normalized.includes("quale voto e sufficiente") ||
    normalized.includes("soglia della sufficienza") ||
    normalized.includes("che significa sufficienza") ||
    normalized.includes("cosa significa la sufficienza") ||
    normalized.includes("qual e la sufficienza") ||
    normalized.includes("significa la sufficienza") ||
    normalized.includes("quanto e la sufficienza") ||
    normalized.includes("quanto serve per la sufficienza") ||
    normalized.includes("qual e la sufficienza") ||
    normalized.includes("sufficienza a scuola");
  if (asksGradeThreshold) {
    return "Nell’indicatore colori di VOTO, la fascia verde parte da 6, quella arancione va da 5 a 5,99 e quella rossa è sotto 5. È una guida grafica dell’app, non stabilisce da sola l’esito dell’anno o il voto finale: valgono i criteri e la valutazione dei docenti.";
  }

  const asksUpcomingAgenda =
    normalized.includes("in agenda") ||
    normalized.includes("quando ho") ||
    normalized.includes("quali interrogazioni") ||
    normalized.includes("quali verifiche") ||
    normalized.includes("quali argomenti") ||
    normalized.includes("mostra le interrogazioni") ||
    normalized.includes("cosa devo preparare") ||
    normalized.includes("cosa devo studiare") ||
    normalized.includes("che cosa devo studiare") ||
    normalized.includes("cosa devo preparare per la prossima interrogazione") ||
    normalized.includes("cosa devo preparare per la prossima verifica");
  const asksExamPreparation =
    includesAny(normalized, ["interrogaz", "verifica", "compito in classe", "esame"]) &&
    includesAny(normalized, [
      "come mi prepar",
      "come preparo",
      "prepararmi",
      "preparare",
      "metodo",
      "ripass",
      "studiare",
      "consigli",
    ]);
  if (asksExamPreparation && !asksUpcomingAgenda) return EXAM_PREPARATION_ANSWER;

  const asksWhatToStudy =
    normalized.includes("cosa devo studiare") ||
    normalized.includes("che cosa devo studiare") ||
    normalized.includes("quali argomenti devo studiare");
  const asksStudyMethod = includesAny(normalized, [
    "come studiare",
    "come devo studiare",
    "come posso studiare",
    "studiare meglio",
    "metodo di studio",
    "metodo per studiare",
    "migliorare il metodo",
    "memorizzare",
    "ricordare meglio",
    "organizzare lo studio",
    "organizzarmi per studiare",
    "concentrarmi nello studio",
    "ripassare meglio",
  ]);
  const asksForSchedule = includesAny(normalized, [
    "questa settimana",
    "per la settimana",
    "per oggi",
    "per domani",
    "per dopodomani",
    "quali giorni",
    "a che ora",
  ]);
  if (asksStudyMethod && !asksWhatToStudy && !asksForSchedule) return STUDY_METHOD_ANSWER;

  return null;
}
