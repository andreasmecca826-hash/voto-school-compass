const SOURCE_NOTICE =
  "Fonte: Regolamento d’Istituto Morselli-Sturzo, A.S. 2025/2026. È una fonte dell’anno precedente e va verificata con la scuola per l’A.S. 2026/2027.";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const withSource = (answer: string) => `${answer} ${SOURCE_NOTICE}`;

/**
 * Risposte locali ricavate dal regolamento fornito dall’utente.
 * Il testo è intenzionalmente sintetico: non viene caricato l’intero PDF a ogni domanda.
 */
export function answerSchoolRegulation(query: string): string | null {
  const normalized = normalize(query);
  const asksAboutRegulation =
    normalized.includes("regolamento") ||
    normalized.includes("regola") ||
    normalized.includes("norma") ||
    normalized.includes("vietato") ||
    normalized.includes("posso usare") ||
    normalized.includes("si puo") ||
    normalized.includes("si può") ||
    normalized.includes("come devo") ||
    normalized.includes("cosa succede se");

  const asksAboutSchoolRule =
    normalized.includes("cellular") ||
    normalized.includes("telefon") ||
    (normalized.includes("giustific") && normalized.includes("assen")) ||
    (normalized.includes("ritard") &&
      (normalized.includes("come") || normalized.includes("regol") || normalized.includes("regola"))) ||
    (normalized.includes("uscita anticip") &&
      (normalized.includes("come") || normalized.includes("regol") || normalized.includes("regola"))) ||
    (normalized.includes("frequenza") &&
      (normalized.includes("regol") || normalized.includes("regola") || normalized.includes("validita"))) ||
    (normalized.includes("ore di scuola") && normalized.includes("regol")) ||
    ((normalized.includes("verifica") || normalized.includes("interrogaz")) && normalized.includes("regol")) ||
    normalized.includes("sanzion") ||
    normalized.includes("copiare") ||
    normalized.includes("fumare");

  const asksAboutStudentRightsDuties =
    (normalized.includes("diritt") || normalized.includes("dover")) &&
    (normalized.includes("student") || normalized.includes("alunn") || normalized.includes("alliev"));

  if (!asksAboutRegulation && !asksAboutSchoolRule && !asksAboutStudentRightsDuties) return null;

  if (asksAboutStudentRightsDuties) {
    return withSource(
      "Secondo il regolamento, gli studenti hanno diritto a una formazione qualificata che valorizzi la loro identità, alla riservatezza, a essere informati sulle norme scolastiche, alla partecipazione attiva e responsabile, alla libertà di apprendimento, al rispetto della propria cultura e religione e a una valutazione trasparente e tempestiva. I loro doveri sono frequentare regolarmente e studiare, rispettare le regole organizzative e di sicurezza, mantenere un comportamento corretto, non copiare né usare strumenti non autorizzati durante le verifiche, rispettare persone e personale, usare correttamente strutture e materiali e contribuire a mantenere accogliente l’ambiente scolastico.",
    );
  }

  if (normalized.includes("cellular") || normalized.includes("telefon")) {
    return withSource(
      "Nel regolamento disponibile è vietato agli studenti portare il cellulare, salvo una deroga richiesta e motivata dalla famiglia e valutata dalla Direzione. Se autorizzato, deve essere consegnato al docente all’arrivo in classe e ritirato al termine delle lezioni. Sono previste eccezioni per uscite di almeno una giornata, alcune uscite mattutine e attività didattiche in cui il docente ne autorizzi l’uso. L’uso non autorizzato può comportare il ritiro del dispositivo e provvedimenti disciplinari.",
    );
  }

  if (normalized.includes("giustific") && normalized.includes("assen")) {
    return withSource(
      "L’assenza deve essere giustificata tempestivamente tramite la funzione online del registro elettronico o, in alternativa, tramite il diario scolastico. Se non viene giustificata, la scuola ne informa la famiglia; il regolamento riporta anche conseguenze progressive in caso di mancata giustificazione nei giorni successivi. Posso spiegare la procedura, ma non inviare una giustificazione direttamente tramite DidUP Famiglia.",
    );
  }

  if (normalized.includes("ritard")) {
    return withSource(
      "Per un ritardo occasionale fino a 10 minuti, lo studente deve spiegarne il motivo al docente della prima ora, che può ammetterlo segnando una R. Dopo tre ritardi è previsto il rientro accompagnato dai genitori; oltre tre ritardi mensili il coordinatore può informare la famiglia. Oltre i 10 minuti l’ingresso avviene dalla seconda ora con motivazione e giustificazione.",
    );
  }

  if (normalized.includes("uscita anticip")) {
    return withSource(
      "L’uscita anticipata deve essere normalmente preannunciata, motivata e giustificata. Per un minorenne è necessaria la presenza di un genitore o di una persona delegata, che compila il modulo e attende all’ingresso. Le uscite anticipate continuative richiedono autorizzazione preventiva della Dirigenza; oltre tre al mese può essere informata la famiglia.",
    );
  }

  if (
    normalized.includes("frequenza") ||
    normalized.includes("ore di scuola") ||
    normalized.includes("validita dell anno") ||
    normalized.includes("validita dell'anno") ||
    normalized.includes("tre quarti")
  ) {
    return withSource(
      "Per la validità dell’anno scolastico il regolamento richiama la frequenza di almeno tre quarti dell’orario annuale personalizzato. Possono essere escluse dal monte ore alcune deroghe approvate dal Collegio dei Docenti e previste nel PTOF. La documentazione delle deroghe deve essere consegnata al rientro e comunque entro 15 giorni, salvo diverse disposizioni ufficiali.",
    );
  }

  if (normalized.includes("verifica") || normalized.includes("interrogaz")) {
    return withSource(
      "Il regolamento indica che gli esiti delle verifiche orali devono essere comunicati il giorno stesso della prova, mentre per verifiche scritte, pratiche e prove autentiche il termine indicato è entro 15 giorni. Gli studenti hanno inoltre diritto a conoscere i criteri di valutazione.",
    );
  }

  if (normalized.includes("copiare") || normalized.includes("sanzion") || normalized.includes("disciplin")) {
    return withSource(
      "Il regolamento richiede un comportamento corretto durante le verifiche: non è consentito suggerire, copiare, usare strumenti non autorizzati o alterare prove e valutazioni. Le infrazioni possono comportare provvedimenti disciplinari proporzionati alla gravità e alle procedure del regolamento di disciplina; per una decisione concreta bisogna rivolgersi alla scuola.",
    );
  }

  if (normalized.includes("fumare")) {
    return withSource(
      "È vietato fumare, comprese le sigarette elettroniche, nei locali dell’Istituto e nelle sue pertinenze esterne. Il regolamento considera la violazione anche una grave infrazione disciplinare, oltre alle conseguenze previste dalla normativa.",
    );
  }

  if (asksAboutRegulation) {
    return withSource(
      "Ho a disposizione una sintesi locale del Regolamento d’Istituto Morselli-Sturzo. Posso cercare regole su assenze, giustificazioni, ritardi, uscite anticipate, frequenza, cellulare, verifiche e disciplina. Per argomenti non presenti nella sintesi, è necessario consultare il PDF completo o la scuola.",
    );
  }

  return null;
}
