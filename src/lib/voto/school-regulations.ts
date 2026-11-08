const SOURCE = "Regolamento d’Istituto Morselli-Sturzo, A.S. 2025/2026";
const YEAR_NOTICE =
  "Il documento è dell’anno scolastico precedente: verifica eventuali aggiornamenti e disposizioni più recenti della scuola per il 2026/2027.";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'");

const hasAny = (query: string, terms: string[]) => terms.some((term) => query.includes(term));

const withSource = (answer: string, articles = "") =>
  `${answer} Fonte: ${SOURCE}${articles ? `, ${articles}` : ""}. ${YEAR_NOTICE}`;

/**
 * Risposte locali e sintetiche ricavate dal regolamento fornito dall’utente.
 * Non carica né invia il PDF durante la conversazione; per casi specifici prevalgono
 * le comunicazioni ufficiali e il regolamento completo.
 */
export function answerSchoolRegulation(query: string): string | null {
  const normalized = normalize(query);
  const asksAboutRegulation = hasAny(normalized, [
    "regolamento",
    "regola",
    "norma",
    "vietato",
    "posso usare",
    "si puo",
    "come devo",
  ]);

  const asksAboutStudentRightsDuties =
    hasAny(normalized, ["diritt", "dover"]) && hasAny(normalized, ["student", "alunn", "alliev"]);
  const asksForPersonalNotes =
    hasAny(normalized, ["nota", "note"]) &&
    hasAny(normalized, ["ho", "miei", "mie", "registrat", "visualizza"]);

  const asksAboutSchoolRule =
    hasAny(normalized, ["cellular", "telefon", "smartphone", "iphone", "tablet", "smartwatch"]) ||
    (normalized.includes("giustific") && normalized.includes("assen")) ||
    (normalized.includes("ritard") &&
      hasAny(normalized, [
        "come",
        "regol",
        "regola",
        "entro",
        "dopo",
        "minuti",
        "seconda ora",
        "succede se",
      ])) ||
    (normalized.includes("uscita anticip") &&
      hasAny(normalized, ["come", "regol", "regola", "permesso", "autorizz", "genitore"])) ||
    (normalized.includes("frequenza") &&
      hasAny(normalized, ["regol", "regola", "validita", "anno scolastico", "tre quarti"])) ||
    (normalized.includes("verifica") &&
      hasAny(normalized, ["regol", "regola", "esito", "risultato", "entro", "criteri"])) ||
    (normalized.includes("interrogaz") &&
      hasAny(normalized, ["regol", "regola", "esito", "risultato", "entro", "criteri"])) ||
    hasAny(normalized, [
      "copiare",
      "copio",
      "copiato",
      "copia",
      "suggerire",
      "fumare",
      "svapare",
      "svapo",
      "sigaretta",
      "sigarette",
      "vape",
    ]) ||
    (hasAny(normalized, [
      "sanzion",
      "sospension",
      "ricorso disciplinare",
      "organo di garanzia",
      "provvedimento disciplinare",
      "nota disciplinare",
      "note disciplinari",
    ]) &&
      !asksForPersonalNotes) ||
    hasAny(normalized, ["bagno", "servizi igienici", "andare in bagno"]) ||
    hasAny(normalized, [
      "ascensore",
      "associazion",
      "liberta di espressione",
      "esprimere il mio pensiero",
      "spazi della scuola",
    ]) ||
    hasAny(normalized, [
      "distributore",
      "distributori",
      "merenda",
      "snack",
      "macchinetta",
      "macchinette",
    ]) ||
    (normalized.includes("assemblea") &&
      hasAny(normalized, [
        "regol",
        "regola",
        "richied",
        "convoc",
        "quanto dura",
        "durata",
        "quante volte",
        "quando si fa",
        "una volta al mese",
      ])) ||
    hasAny(normalized, [
      "viaggio d'istruzione",
      "viaggio di istruzione",
      "viaggi d'istruzione",
      "viaggi di istruzione",
      "gita scolastica",
      "gite scolastiche",
      "gite",
      "visita guidata",
      "uscita didattica",
    ]) ||
    hasAny(normalized, [
      "porta di sicurezza",
      "porte di sicurezza",
      "scala antincendio",
      "scale antincendio",
      "terrazza esterna",
      "corridoio",
      "corridoi",
      "laboratorio da solo",
      "andare in laboratorio da solo",
      "palestra da solo",
    ]) ||
    hasAny(normalized, [
      "bullismo",
      "bullizzare",
      "intimidaz",
      "discriminaz",
      "filmare i compagni",
      "filmare docenti",
      "riprendere i compagni",
      "riprendere docenti",
      "foto ai compagni",
      "foto ai docenti",
      "fotografare i compagni",
      "fotografare docenti",
      "registrare i compagni",
      "filmo il compagno",
      "filmo la prof",
      "faccio un video",
      "pubblico foto",
    ]) ||
    hasAny(normalized, [
      "oggetto smarrito",
      "furto",
      "smarrimento",
      "perquisizione",
      "perquisire",
      "danneggiare",
      "danneggio",
      "danni agli arredi",
      "rompere un banco",
      "rompo un banco",
    ]) ||
    hasAny(normalized, [
      "farmaco",
      "farmaci",
      "medicinale",
      "medicinali",
      "salvavita",
      "malore",
      "infortunio",
      "infortunata",
    ]) ||
    hasAny(normalized, [
      "orario di ingresso",
      "orario scolastico",
      "orario della scuola",
      "a che ora inizia la scuola",
      "a che ora iniziano le lezioni",
      "a che ora si entra a scuola",
      "a che ora finisce la scuola",
      "a che ora finiscono le lezioni",
      "entrare prima delle 8",
      "entrare prima delle otto",
      "a che ora posso entrare",
      "cancello della scuola",
      "intervallo",
      "ricreazione",
      "pausa di socializzazione",
    ]) ||
    (hasAny(normalized, ["ingresso", "entrata", "seconda ora"]) &&
      hasAny(normalized, [
        "orario",
        "ritardo",
        "ritard",
        "a che ora",
        "prima delle",
        "posso entrare",
        "entrata posticipata",
      ])) ||
    hasAny(normalized, [
      "abbigliamento",
      "come vestirmi a scuola",
      "vestire a scuola",
      "vestiti a scuola",
    ]) ||
    hasAny(normalized, [
      "corridoio",
      "corridoi",
      "laboratorio da solo",
      "andare in laboratorio da solo",
      "palestra da solo",
    ]) ||
    (hasAny(normalized, ["assemblea", "diritti degli studenti", "liberta di espressione"]) &&
      asksAboutRegulation);

  if (!asksAboutRegulation && !asksAboutSchoolRule && !asksAboutStudentRightsDuties) return null;

  if (
    hasAny(normalized, ["fonte", "documento", "pdf", "anno scolastico"]) &&
    asksAboutRegulation &&
    !hasAny(normalized, ["frequenza", "inizia", "finisce", "ritardo"])
  ) {
    return withSource(
      "La sintesi che consulto è stata ricavata dal PDF del Regolamento d’Istituto Morselli-Sturzo allegato alla conversazione. Non è una verifica delle circolari successive né sostituisce il documento ufficiale completo.",
    );
  }

  if (asksAboutStudentRightsDuties) {
    return withSource(
      "Gli studenti hanno diritto, tra l’altro, a una formazione qualificata che valorizzi la loro identità, alla riservatezza, a essere informati sulle regole scolastiche, alla partecipazione, alla libertà di apprendimento, al rispetto della propria cultura e religione e a una valutazione trasparente e tempestiva. Tra i doveri: frequentare regolarmente i corsi e assolvere assiduamente agli impegni di studio, rispettare le disposizioni organizzative e di sicurezza, mantenere un comportamento corretto, non copiare né usare strumenti non autorizzati durante le verifiche, rispettare persone e personale e aver cura di strutture e materiali.",
      "artt. 5–10",
    );
  }

  if (hasAny(normalized, ["cellular", "telefon", "smartphone", "iphone", "tablet", "smartwatch"])) {
    return withSource(
      "In base al regolamento, è vietato agli studenti portare il cellulare salvo deroga motivata richiesta dalla famiglia e concessa dalla Direzione. Se autorizzato, va consegnato al docente all’arrivo in classe e ritirato al termine delle lezioni. Sono previste eccezioni per le uscite di almeno un’intera giornata e per alcune attività didattiche o esigenze logistiche, sempre secondo le indicazioni dei docenti. L’uso improprio può comportare il ritiro immediato e provvedimenti disciplinari.",
      "art. 5",
    );
  }

  if (normalized.includes("giustific") && normalized.includes("assen")) {
    return withSource(
      "L’assenza va giustificata tempestivamente con la funzione online del Registro Elettronico oppure, in alternativa, sul diario. Il regolamento richiede di regolarizzarla entro i 3 giorni successivi: nel frattempo lo studente può essere ammesso con riserva e annotazione; al quarto giorno viene avvisata la famiglia e il giorno seguente può essere richiesto che un genitore accompagni lo studente. Le assenze ingiustificate incidono sulla valutazione del comportamento. Posso spiegare la procedura, ma non inviare una giustificazione direttamente tramite DidUP Famiglia.",
      "art. 4 e art. 18.2",
    );
  }

  if (normalized.includes("ritard")) {
    return withSource(
      "Per un ritardo occasionale non abituale fino a 10 minuti, spiega il motivo al docente della prima ora: se lo ritiene valido può ammetterti segnando una R. Superati i 10 minuti si entra dalla seconda ora; il ritardo deve essere motivato e giustificato. Il regolamento dice che dopo tre ritardi brevi si è riammessi accompagnati dai genitori; per ingressi posticipati oltre tre al mese può servire l’autorizzazione del collaboratore vicario e viene informata la famiglia. Gli ingressi continuativi richiedono una richiesta scritta e autorizzazione preventiva della Dirigenza.",
      "art. 18.2–18.3",
    );
  }

  if (normalized.includes("uscita anticip")) {
    return withSource(
      "L’uscita anticipata, salvo un evento accaduto a scuola, va normalmente preannunciata dal genitore, motivata e giustificata. Per un minorenne deve essere autorizzata dal genitore o da una persona delegata, che compila il modulo e attende all’ingresso: lo studente non esce da solo. Le uscite continuative richiedono autorizzazione preventiva della Dirigenza; oltre tre uscite mensili interviene il collaboratore vicario e vengono informate Dirigente e famiglia. Per un maggiorenne la richiesta è autorizzata dal docente e la segreteria informa almeno un genitore.",
      "art. 19.1",
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
      "Per la validità dell’anno scolastico il regolamento richiede la frequenza di almeno tre quarti dell’orario annuale personalizzato. Alcune assenze possono essere escluse dal conteggio solo se rientrano nelle deroghe approvate dal Collegio dei Docenti e previste nel PTOF. La documentazione delle deroghe va consegnata all’Ufficio protocollo al rientro e comunque entro 15 giorni; per la documentazione medica il regolamento non ammette certificati prodotti a posteriori per malattie pregresse.",
      "art. 21",
    );
  }

  if (
    hasAny(normalized, [
      "a che ora inizia la scuola",
      "a che ora iniziano le lezioni",
      "a che ora finisce la scuola",
      "a che ora finiscono le lezioni",
      "orario scolastico",
      "orario della scuola",
      "intervallo",
      "ricreazione",
      "pausa di socializzazione",
    ]) &&
    !hasAny(normalized, ["bagno", "servizi igienici"])
  ) {
    return withSource(
      "Le attività si svolgono normalmente dal lunedì al venerdì, dalle 8:00 alle 14:30, salvo diverse comunicazioni; la scansione delle ore cambia in base al giorno. Il regolamento prevede due pause: 10 minuti tra la terza e la quarta unità oraria e 5 minuti tra la quinta e la sesta, da svolgere in classe. Durante le pause bisogna seguire le indicazioni dei docenti e rientrare in aula entro 5 minuti dalla fine.",
      "art. 17 e art. 24",
    );
  }

  if (
    hasAny(normalized, [
      "orario di ingresso",
      "a che ora si entra a scuola",
      "a che ora entro a scuola",
      "a che ora posso entrare",
      "ingresso a scuola",
      "entrare prima delle 8",
      "entrare prima delle otto",
      "cancello della scuola",
    ])
  ) {
    return withSource(
      "L’ingresso negli edifici è consentito al suono della campanella delle 8:00; gli alunni attendono nell’atrio entro il cancello principale. Tra le 7:30 e le 8:00 la scuola precisa che non può garantire la vigilanza. L’ammissione in classe alla prima ora è eccezionalmente possibile fino alle 8:10; oltre 10 minuti si entra dalla seconda ora secondo la procedura per i ritardi.",
      "art. 17 e art. 18.1–18.2",
    );
  }

  if (hasAny(normalized, ["bagno", "servizi igienici", "andare in bagno"])) {
    return withSource(
      "Per andare ai servizi durante la lezione serve il permesso del docente; l’uscita viene annotata. Non è consentito andarci durante gli intervalli. L’accesso è previsto dalla seconda ora; alla prima e all’ultima ora è ammesso solo eccezionalmente. Richieste ripetute devono essere giustificate con certificato medico consegnato al coordinatore. Non si può girare per corridoi o entrare in altre aule, laboratori, palestra o uffici senza permesso.",
      "art. 22",
    );
  }

  if (
    hasAny(normalized, [
      "distributore",
      "distributori",
      "merenda",
      "snack",
      "macchinetta",
      "macchinette",
    ])
  ) {
    return withSource(
      "I distributori automatici, quando attivi, si possono usare prima dell’ingresso in classe (7:45–8:00), poco prima di entrare per chi arriva alla seconda ora e durante la prima ricreazione. Durante le lezioni non si può interrompere l’attività per comprare snack o bevande. È ammesso portare da casa nello zaino un pasto autonomo adatto alla classe, evitando pietanze elaborate o con odori forti; non è consentito far portare vivande da terze persone non autorizzate.",
      "art. 2, art. 24 e art. 25",
    );
  }

  if (normalized.includes("ascensore")) {
    return withSource(
      "Gli studenti con difficoltà di deambulazione certificate o accertate possono usare l’ascensore solo se accompagnati da un collaboratore scolastico.",
      "art. 23",
    );
  }

  if (
    hasAny(normalized, [
      "associazion",
      "liberta di espressione",
      "esprimere il mio pensiero",
      "spazi della scuola",
    ])
  ) {
    return withSource(
      "Gli studenti possono associarsi liberamente nell’Istituto; per usare spazi scolastici in orario extracurricolare è necessaria l’autorizzazione del Dirigente o di un suo delegato. La libertà di esprimere il proprio pensiero è riconosciuta nel rispetto dei diritti altrui; per pubblicare o diffondere fogli e periodici negli spazi scolastici servono una fonte manifesta, il rispetto della legge e l’autorizzazione del Dirigente.",
      "art. 9 e art. 10",
    );
  }

  if (normalized.includes("assemblea")) {
    return withSource(
      "È prevista un’assemblea d’Istituto al mese, esclusi gli ultimi 30 giorni di lezione; la richiesta va presentata almeno 5 giorni prima e l’assemblea deve essere autorizzata dal Dirigente. L’assemblea di classe è consentita una volta al mese (tranne negli ultimi 30 giorni), per al massimo 2 ore; può essere richiesta dai rappresentanti o da almeno la metà più uno della classe e va inoltrata almeno 5 giorni prima con ordine del giorno, data, orario e firme dei docenti interessati. Le assemblee di classe non si tengono nei laboratori.",
      "art. 11 e art. 12",
    );
  }

  if (
    hasAny(normalized, [
      "viaggio d'istruzione",
      "viaggio di istruzione",
      "viaggi d'istruzione",
      "viaggi di istruzione",
      "gita scolastica",
      "gite scolastiche",
      "gite",
      "visita guidata",
      "uscita didattica",
    ])
  ) {
    return withSource(
      "Per un viaggio d'istruzione è richiesta la partecipazione di almeno due terzi della classe; chi non partecipa deve frequentare a scuola secondo l’orario normale e, se assente, giustificare l’assenza. Alle visite guidate e alle uscite didattiche di un giorno è prevista la partecipazione dell’intera classe; un’eventuale assenza va giustificata. Viaggi e visite guidate non si svolgono di norma negli ultimi 30 giorni di lezione, salvo deroga motivata e autorizzata. Il Consiglio di classe valuta l’eventuale partecipazione di studenti che abbiano ricevuto provvedimenti disciplinari.",
      "art. 37",
    );
  }

  if (hasAny(normalized, ["fumare", "svapare", "svapo", "sigaretta", "sigarette", "vape"])) {
    return withSource(
      "È vietato fumare, comprese le sigarette elettroniche, in tutti i locali dell’Istituto e nelle sue pertinenze esterne. Il regolamento considera la violazione una grave infrazione disciplinare, oltre alle conseguenze previste dalla normativa.",
      "art. 33",
    );
  }

  if (
    hasAny(normalized, [
      "bullismo",
      "bullizzare",
      "intimidaz",
      "discriminaz",
      "filmare i compagni",
      "riprendere i compagni",
      "foto ai compagni",
      "fotografare i compagni",
      "registrare i compagni",
    ])
  ) {
    return withSource(
      "Il regolamento vieta bullismo, intimidazioni, aggressioni e discriminazioni. Vieta inoltre di riprendere o filmare compagni e docenti con il videotelefono: la diffusione di immagini senza le autorizzazioni necessarie può avere conseguenze ulteriori. Per un episodio concreto, rivolgiti a un docente o alla Dirigenza e verifica le procedure aggiornate della scuola.",
      "art. 5 e art. 29",
    );
  }

  if (
    hasAny(normalized, [
      "porta di sicurezza",
      "porte di sicurezza",
      "scala antincendio",
      "scale antincendio",
      "terrazza esterna",
      "corridoio",
      "corridoi",
      "laboratorio da solo",
      "andare in laboratorio da solo",
      "palestra da solo",
    ])
  ) {
    return withSource(
      "In condizioni ordinarie non si possono usare le porte di sicurezza per entrare o uscire. Durante i cambi d’ora e le pause è vietato sostare sulle scale antincendio e sulle terrazze esterne. Gli spostamenti in altri ambienti scolastici richiedono il permesso del docente e la vigilanza prevista dal regolamento.",
      "art. 22 e art. 34",
    );
  }

  if (
    hasAny(normalized, [
      "oggetto smarrito",
      "furto",
      "smarrimento",
      "perquisizione",
      "perquisire",
      "danneggiare",
      "danneggio",
      "danni agli arredi",
      "rompere un banco",
      "rompo un banco",
    ])
  ) {
    return withSource(
      "Il regolamento invita a non portare oggetti di valore e precisa che la scuola non risponde di furto, smarrimento o danneggiamento degli oggetti personali. Il personale scolastico non è autorizzato a perquisire studenti o zaini; il regolamento indica che tali operazioni spettano alle Forze dell’Ordine secondo la legge. I danni alle strutture o alle dotazioni imputabili agli studenti possono comportare provvedimenti e risarcimento.",
      "art. 29 e art. 30",
    );
  }

  if (hasAny(normalized, ["farmaco", "farmaci", "medicinale", "medicinali", "salvavita"])) {
    return withSource(
      "Il personale scolastico non è autorizzato a somministrare farmaci, salvo la procedura prevista per i farmaci salvavita e le terapie programmate. In quel caso il regolamento richiede autorizzazione scritta dei genitori, prescrizione del medico e istruzioni precise per la somministrazione e l’emergenza. Per un farmaco ordinario è consentito l’ingresso del genitore o di una persona delegata. Concorda sempre il caso concreto con la segreteria.",
      "art. 36",
    );
  }

  if (hasAny(normalized, ["malore", "infortunio", "infortunata"])) {
    return withSource(
      "In caso di malore o infortunio a scuola, il regolamento prevede di chiamare l’addetto al primo soccorso, avvisare i familiari e, nelle situazioni gravi o anche solo presumibilmente gravi, richiedere l’intervento urgente dei servizi sanitari (118). Se sta succedendo ora, avvisa subito un docente o un collaboratore scolastico.",
      "art. 35",
    );
  }

  if (
    hasAny(normalized, [
      "sanzion",
      "sospension",
      "ricorso disciplinare",
      "organo di garanzia",
      "provvedimento disciplinare",
      "nota disciplinare",
      "note disciplinari",
    ]) &&
    !asksForPersonalNotes
  ) {
    return withSource(
      "Le sanzioni previste vanno dal richiamo verbale e attività educative alle ammonizioni, all’esclusione da alcune uscite e, nei casi più gravi, all’allontanamento dalla scuola. Devono essere proporzionate e lo studente deve poter esporre le proprie ragioni prima della decisione. In sintesi, il documento attribuisce al singolo docente e al Dirigente le sanzioni fino all’ammonizione scritta, al Consiglio di classe quelle fino a 15 giorni e al Consiglio d’Istituto quelle più gravi. Il ricorso dei genitori all’Organo di Garanzia interno è indicato entro 15 giorni dalla comunicazione. Non posso prevedere quale sanzione si applicherebbe a un caso concreto.",
      "Appendice 2, pp. 46–49",
    );
  }

  if (hasAny(normalized, ["copiare", "copio", "copiato", "copia", "suggerire"])) {
    return withSource(
      "Durante le verifiche non è consentito suggerire, copiare, usare sussidi o sistemi non autorizzati né alterare o falsificare prove o valutazioni. Le eventuali conseguenze dipendono dalla gravità, dalle circostanze e dalla procedura disciplinare; non posso prevedere l’esito di un caso concreto.",
      "art. 7 e Appendice 2",
    );
  }

  if (normalized.includes("verifica") || normalized.includes("interrogaz")) {
    return withSource(
      "Il regolamento indica che gli esiti delle verifiche orali devono essere comunicati il giorno stesso della prova, mentre per le verifiche scritte, pratiche e le prove autentiche il termine è entro 15 giorni. Gli studenti hanno inoltre diritto a conoscere i criteri di valutazione.",
      "art. 2 e art. 6",
    );
  }

  if (
    hasAny(normalized, [
      "abbigliamento",
      "come vestirmi a scuola",
      "vestire a scuola",
      "vestiti a scuola",
    ])
  ) {
    return withSource(
      "Il regolamento richiede un abbigliamento e un linguaggio adeguati al luogo e all’istituzione. In questo passaggio non specifica un elenco di capi consentiti o vietati.",
      "art. 7",
    );
  }

  if (asksAboutRegulation) {
    return withSource(
      "Ho una sintesi locale del Regolamento d’Istituto Morselli-Sturzo. Posso rispondere su diritti e doveri, cellulare, assenze e giustificazioni, ritardi e uscite, frequenza, orari e intervalli, bagni, distributori, assemblee, viaggi, ascensore, associazioni e libertà di espressione, sicurezza, tutela dei beni, farmaci e disciplina. Per argomenti non inclusi nella sintesi, consulta il PDF completo o la scuola.",
    );
  }

  return null;
}
