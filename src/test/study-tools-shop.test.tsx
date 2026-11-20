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
});
