const normalize = (value: string) =>
  value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

const SCHOOL_NAME = "I.I.S. “E. Morselli - L. Sturzo”";
const SCHOOL_ADDRESS = "Via Pitagora s.n.c., 93012 Gela (Caltanissetta)";
const OFFICE_HOURS =
  "Lunedì, mercoledì e venerdì dalle 10:00 alle 12:00; martedì e giovedì dalle 16:00 alle 17:00.";
const SOURCE_NOTE =
  "Informazione tratta dall’avviso fornito: non è visibile una data di validità, quindi verifica eventuali aggiornamenti direttamente con l’Istituto.";

export function answerSchoolAdministrativeInfo(question: string): string | null {
  const normalized = normalize(question);
  if (!normalized) return null;

  const mentionsOffice = includesAny(normalized, ["uffici", "ufficio", "segreteria"]);
  const asksOfficeHours =
    mentionsOffice &&
    includesAny(normalized, [
      "orar",
      "apert",
      "apr",
      "al pubblico",
      "quando",
      "a che ora",
      "ricev",
      "sabato",
      "domenica",
    ]);
  if (asksOfficeHours) {
    const weekendNotSpecified = includesAny(normalized, ["sabato", "domenica", "weekend"])
      ? " L’avviso non specifica gli orari per sabato o domenica; non posso dedurre che gli uffici siano aperti o chiusi in quei giorni."
      : "";
    return `Orari di apertura al pubblico degli uffici dell’${SCHOOL_NAME}: ${OFFICE_HOURS}${weekendNotSpecified} ${SOURCE_NOTE}`;
  }

  const mentionsPrincipal = includesAny(normalized, ["dirigente", "preside"]);
  const asksPrincipalInfo =
    mentionsPrincipal &&
    includesAny(normalized, [
      "chi e",
      "nome",
      "appuntament",
      "ricev",
      "incontr",
      "colloqu",
      "quando",
    ]);
  if (asksPrincipalInfo) {
    return `Nell’avviso il Dirigente Scolastico è indicato come Prof. Franco Ferrara e riceve per appuntamento. Il foglio non spiega come prenotarlo; per questo contatta l’Istituto. ${SOURCE_NOTE}`;
  }

  const asksAddress =
    includesAny(normalized, [
      "indirizzo",
      "dove si trova",
      "dove e",
      "come arrivo",
      "come raggiungo",
      "via pitagora",
    ]) &&
    includesAny(normalized, [
      "scuola",
      "istituto",
      "morselli",
      "sturzo",
      "segreteria",
      "via pitagora",
    ]);
  if (asksAddress) {
    return `${SCHOOL_NAME} si trova in ${SCHOOL_ADDRESS}. ${SOURCE_NOTE}`;
  }

  return null;
}
