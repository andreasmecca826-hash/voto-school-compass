import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StudyToolsShop } from "@/components/voto/StudyToolsShop";

const TRACK_KEY = "voto.study-tools-shop.track.v1";
const SCHOOL_KEY = "voto.study-tools-shop.school.v1";
const FAVORITE_SCHOOLS_KEY = "voto.study-tools-shop.favorite-schools.v1";
const FAVORITE_TRACKS_KEY = "voto.study-tools-shop.favorite-tracks.v1";

function chooseSchool(name: string) {
  fireEvent.click(screen.getAllByRole("button", { name: new RegExp(name) })[0]!);
}

function chooseTrack(name: string) {
  fireEvent.click(screen.getAllByRole("button", { name: new RegExp(name) })[0]!);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Negozio strumenti per scuola e indirizzo", () => {
  it("chiede prima la scuola e poi apre Informatica con il convertitore", () => {
    render(<StudyToolsShop />);
    expect(screen.getByRole("heading", { name: "Negozio strumenti" })).toBeInTheDocument();
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Informatica");
    fireEvent.click(screen.getByRole("button", { name: "Apri Convertitore di basi" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Numero da convertire" }), {
      target: { value: "101101" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Base di partenza" }), {
      target: { value: "2" },
    });
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(localStorage.getItem(SCHOOL_KEY)).toBe("morselli-sturzo");
    expect(localStorage.getItem(TRACK_KEY)).toBe("informatica");
  });

  it("filtra Elettronica e calcola la tensione con la legge di Ohm", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Elettronica");
    fireEvent.click(screen.getByRole("button", { name: "Apri Legge di Ohm" }));
    fireEvent.change(screen.getByLabelText("Corrente (A)"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Resistenza (Ω)"), { target: { value: "10" } });
    expect(screen.getByRole("status", { name: "Risultato: Tensione 20 V" })).toBeInTheDocument();
  });

  it("salva scuola e indirizzo preferiti con le stelle", () => {
    render(<StudyToolsShop />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Aggiungi scuola preferita: IIS E. Morselli - L. Sturzo",
      }),
    );
    chooseSchool("IIS E. Morselli - L. Sturzo");
    fireEvent.click(
      screen.getByRole("button", { name: "Aggiungi indirizzo preferito: Informatica" }),
    );
    expect(localStorage.getItem(FAVORITE_SCHOOLS_KEY)).toBe('["morselli-sturzo"]');
    expect(localStorage.getItem(FAVORITE_TRACKS_KEY)).toBe('["informatica"]');
  });

  it("riapre subito la scuola e l’indirizzo preferiti", async () => {
    localStorage.setItem(FAVORITE_SCHOOLS_KEY, '["majorana"]');
    localStorage.setItem(FAVORITE_TRACKS_KEY, '["cat"]');
    render(<StudyToolsShop />);
    await waitFor(() => {
      expect(screen.getByText("Costruzioni, Ambiente e Territorio (C.A.T.)")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Apri Proporzioni di tavole e rilievi" }),
    ).toBeInTheDocument();
  });

  it("offre gli indirizzi del Vittorini e gli strumenti dedicati", () => {
    render(<StudyToolsShop />);
    chooseSchool('Liceo Scientifico e Linguistico "E. Vittorini"');
    chooseTrack("Liceo Linguistico · E. Vittorini");
    expect(screen.getByRole("button", { name: "Apri Cambio valuta e viaggi" })).toBeInTheDocument();
  });

  it("calcola una diluizione nel laboratorio di chimica", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Chimica e Materiali");
    fireEvent.click(screen.getByRole("button", { name: "Apri Laboratorio molarità e diluizioni" }));
    expect(screen.getByRole("status")).toHaveTextContent("25.00 mL");
  });

  it("calcola statistiche e regressione per lo scientifico", () => {
    render(<StudyToolsShop />);
    chooseSchool('Liceo Scientifico e Linguistico "E. Vittorini"');
    chooseTrack("Liceo Scientifico · E. Vittorini");
    fireEvent.click(
      screen.getByRole("button", { name: "Apri Statistica descrittiva e regressione" }),
    );
    fireEvent.change(screen.getByLabelText("Valori statistici"), { target: { value: "1, 2, 3" } });
    expect(screen.getByText(/2\.00 \/ 2/)).toBeInTheDocument();
    expect(screen.getByText(/y = 1\.000x/)).toBeInTheDocument();
  });

  it("calcola distanza ed ETA per il nautico", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Majorana");
    chooseTrack("Nautico");
    fireEvent.click(screen.getByRole("button", { name: "Apri Rotta nautica ed ETA" }));
    expect(screen.getByRole("status")).toHaveTextContent("Distanza:");
    expect(screen.getByRole("status")).toHaveTextContent("ETA:");
  });

  it("mostra l'anteprima HTML/CSS in un iframe sandboxato", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Informatica");
    fireEvent.click(screen.getByRole("button", { name: "Apri Laboratorio web HTML/CSS" }));
    expect(screen.getByRole("textbox", { name: "Editor HTML" })).toBeInTheDocument();
    expect(screen.getByTitle("Anteprima HTML e CSS")).toHaveAttribute("sandbox", "");
  });

  it("esegue SELECT solo sul dataset SQL locale", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Sistemi Informativi Aziendali");
    fireEvent.click(screen.getByRole("button", { name: "Apri Laboratorio SQL aziendale" }));
    expect(screen.getByRole("status", { name: "Risultato query SQL" })).toHaveTextContent(
      "Arianna",
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Query SQL" }), {
      target: { value: "DELETE FROM studenti;" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Query non riconosciuta");
  });

  it("risolve un'equazione quadratica e aggiorna la tabella matematica", () => {
    render(<StudyToolsShop />);
    chooseSchool('Liceo Scientifico e Linguistico "E. Vittorini"');
    chooseTrack("Liceo Scientifico · E. Vittorini");
    fireEvent.click(screen.getByRole("button", { name: "Apri Laboratorio equazioni e funzioni" }));
    expect(screen.getByRole("status", { name: "Risultato equazione" })).toHaveTextContent(
      "1.00, 2.00",
    );
    fireEvent.change(screen.getByLabelText("a"), { target: { value: "0" } });
    expect(screen.getByRole("status", { name: "Risultato equazione" })).toHaveTextContent("0.67");
    expect(screen.getByText("Tabella valori e grafico semplice")).toBeInTheDocument();
  });

  it("mostra le misure del laboratorio elettronico DC/AC", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Elettronica");
    fireEvent.click(screen.getByRole("button", { name: "Apri Laboratorio elettronico DC/AC" }));
    expect(screen.getByRole("status", { name: "Misure circuito" })).toBeInTheDocument();
    expect(screen.getByText("Tabella misure didattiche")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Modalità circuito" }), {
      target: { value: "AC" },
    });
    expect(screen.getByText(/I totale \(AC\)/)).toBeInTheDocument();
  });

  it("apre safety-lab e aggiorna il conteggio quando spunta una voce", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Elettronica");
    fireEvent.click(screen.getByRole("button", { name: "Apri Safety lab elettronica e officina" }));
    expect(screen.getByRole("note")).toHaveTextContent("non sostituisce procedure ufficiali");
    expect(screen.getByRole("status", { name: "Completamento checklist" })).toHaveTextContent(
      "0 / 15 completate",
    );
    fireEvent.click(screen.getByLabelText("Controlla banco, cavi e protezioni"));
    expect(screen.getByRole("status", { name: "Completamento checklist" })).toHaveTextContent(
      "1 / 15 completate",
    );
  });

  it("calcola massa molare e moli nel nuovo laboratorio di chimica", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Chimica e Materiali");
    fireEvent.click(
      screen.getByRole("button", { name: "Apri Laboratorio formula e stechiometria" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Formula chimica" }), {
      target: { value: "CO2" },
    });
    fireEvent.change(screen.getByLabelText("Massa del campione (g)"), {
      target: { value: "44" },
    });
    expect(screen.getByRole("status", { name: "Risultato stechiometria" })).toHaveTextContent(
      "0.9998 mol",
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Formula chimica" }), {
      target: { value: "H2O(" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Formula non valida");
  });

  it("calcola complementare DNA e traduzione codoni nel laboratorio biotech", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Biotecnologie Sanitarie");
    fireEvent.click(screen.getByRole("button", { name: "Apri Laboratorio DNA/RNA e codoni" }));
    expect(screen.getByRole("status", { name: "Risultato biologia molecolare" })).toHaveTextContent(
      "Complementare: TACCCGATT",
    );
    expect(screen.getByRole("status", { name: "Risultato biologia molecolare" })).toHaveTextContent(
      "Met · Gly · STOP",
    );
  });
  it("apre il laboratorio di fisica e calcola il moto con tabella", () => {
    render(<StudyToolsShop />);
    chooseSchool('Liceo Scientifico e Linguistico "E. Vittorini"');
    chooseTrack("Liceo Scientifico · E. Vittorini");
    fireEvent.click(screen.getByRole("button", { name: "Apri Laboratorio di fisica" }));
    fireEvent.change(screen.getByLabelText("Velocità (m/s)"), { target: { value: "10" } });
    expect(screen.getByRole("status", { name: /Risultato fisica: spazio/ })).toHaveTextContent(
      "spazio = 75.00 m",
    );
    expect(screen.getByText("Tabella modello")).toBeInTheDocument();
  });
  it("apre il laboratorio business e aggiorna il registro locale", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Amministrazione, Finanza e Marketing");
    fireEvent.click(screen.getByRole("button", { name: "Apri Laboratorio business" }));
    fireEvent.change(screen.getByLabelText("Movimenti business"), {
      target: { value: "100,-25" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("saldo registro: 75.00 €");
    expect(screen.getByText(/non calcola imposte/)).toBeInTheDocument();
  });
  it("apre geo-survey lab e cambia tra rilievo, pendenza e superfici", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Majorana");
    chooseTrack("Costruzioni, Ambiente e Territorio");
    fireEvent.click(screen.getByRole("button", { name: "Apri Geo-survey lab" }));
    expect(screen.getByRole("status", { name: "Risultato geo-survey" })).toHaveTextContent(
      "Distanza planimetrica",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Modalità geo-survey" }), {
      target: { value: "slope" },
    });
    expect(screen.getByRole("status", { name: "Risultato geo-survey" })).toHaveTextContent(
      "pendenza",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Modalità geo-survey" }), {
      target: { value: "surface" },
    });
    expect(screen.getByRole("status", { name: "Risultato geo-survey" })).toHaveTextContent(
      "Superficie",
    );
    fireEvent.change(screen.getByLabelText("Lunghezza"), { target: { value: "" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Inserisci solo numeri");
  });

  it("apre navigation lab e calcola tempo e autonomia senza duplicare il planner", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Majorana");
    chooseTrack("Nautico");
    fireEvent.click(screen.getByRole("button", { name: "Apri Navigation lab" }));
    expect(screen.getByRole("status", { name: "Risultato navigation lab" })).toHaveTextContent(
      "tempo: 4.00 h",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Modulo navigation lab" }), {
      target: { value: "autonomy" },
    });
    expect(screen.getByRole("status", { name: "Risultato navigation lab" })).toHaveTextContent(
      "Autonomia: 30.0 h",
    );
    fireEvent.change(screen.getByLabelText("Velocità (km/h)"), { target: { value: "0" } });
    expect(screen.getByRole("alert")).toHaveTextContent("velocità");
  });

  it("apre language classics lab con flashcard e analisi guidata", () => {
    render(<StudyToolsShop />);
    chooseSchool('IIS "Eschilo"');
    chooseTrack("Liceo Classico");
    fireEvent.click(screen.getByRole("button", { name: "Apri Language classics lab" }));
    expect(screen.getByText("amo, amas, amare")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rivela" }));
    expect(screen.getByText(/1ª coniugazione/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Modalità classici" }), {
      target: { value: "analysis" },
    });
    expect(screen.getByRole("status", { name: "Guida analisi frase" })).toHaveTextContent(
      "Soggetto",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Modalità classici" }), {
      target: { value: "translation" },
    });
    expect(screen.getByText(/Supporto didattico locale/)).toBeInTheDocument();
  });

  it("apre hospitality e calcola disponibilità, occupazione e ADR", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Morselli - L. Sturzo");
    chooseTrack("Accoglienza Turistica");
    fireEvent.click(screen.getByRole("button", { name: "Apri Simulazione hospitality" }));
    fireEvent.change(screen.getByLabelText("Camere totali"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Prenotazioni"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Check-in attivi"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Ricavo simulato (€)"), { target: { value: "500" } });
    expect(screen.getByRole("status")).toHaveTextContent("Disponibilità: 4 camere");
    expect(screen.getByRole("status")).toHaveTextContent("occupazione: 50.0%");
    expect(screen.getByRole("status")).toHaveTextContent("ADR: 100.00 €");
  });
});

describe("quinto blocco laboratori didattici", () => {
  it("apre design lab e cambia modalità tra tipografia e impaginazione", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Majorana");
    chooseTrack("Liceo Artistico · Arti Figurative");
    fireEvent.click(screen.getByRole("button", { name: "Apri Design lab artistico" }));
    expect(screen.getByRole("status", { name: "Guida design" })).toHaveTextContent(
      "Scegli una dominante",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Modalità design" }), {
      target: { value: "type" },
    });
    expect(screen.getByRole("status", { name: "Guida design" })).toHaveTextContent("carattere");
    fireEvent.change(screen.getByRole("combobox", { name: "Modalità design" }), {
      target: { value: "layout" },
    });
    expect(screen.getByRole("status", { name: "Guida design" })).toHaveTextContent("griglia");
  });

  it("calcola frequenze e percentuali nel social research lab", () => {
    render(<StudyToolsShop />);
    chooseSchool('IIS "Eschilo"');
    chooseTrack("Liceo delle Scienze Umane");
    fireEvent.click(screen.getByRole("button", { name: "Apri Social research lab" }));
    fireEvent.change(screen.getByLabelText("Frequenze questionario"), {
      target: { value: "10, 5, 5" },
    });
    expect(screen.getByRole("status", { name: "Risultato ricerca sociale" })).toHaveTextContent(
      "20 risposte locali",
    );
    expect(screen.getByLabelText("Grafico frequenze")).toHaveTextContent("50.0%");
  });

  it("guida anatomia, occlusione e workflow nel dental materials lab", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Majorana");
    chooseTrack("Odontotecnico");
    fireEvent.click(screen.getByRole("button", { name: "Apri Dental materials lab" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Modulo dental materials" }), {
      target: { value: "workflow" },
    });
    expect(screen.getByRole("status", { name: "Guida dental materials" })).toHaveTextContent(
      "impronta",
    );
    expect(screen.getByText(/Solo didattico/)).toBeInTheDocument();
  });

  it("genera una shot-list locale con scena, durata e audio", () => {
    render(<StudyToolsShop />);
    chooseSchool("IIS E. Majorana");
    chooseTrack("Audiovisivo e Multimediale");
    fireEvent.click(screen.getByRole("button", { name: "Apri Media storyboard lab" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: /Durata/ }), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText("Audio scena"), { target: { value: "Dialogo" } });
    expect(screen.getByRole("status", { name: "Shot-list storyboard" })).toHaveTextContent(
      "12 s · audio: Dialogo",
    );
  });
});
