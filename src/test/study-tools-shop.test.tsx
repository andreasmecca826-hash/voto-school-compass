import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudyToolsShop } from "@/components/voto/StudyToolsShop";

const TRACK_KEY = "voto.study-tools-shop.track.v1";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Negozio strumenti per indirizzo", () => {
  it("mostra il catalogo di Informatica e converte un valore tra basi", () => {
    render(<StudyToolsShop />);
    expect(screen.getByRole("heading", { name: "Negozio strumenti" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Apri Convertitore di basi" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Numero da convertire" }), {
      target: { value: "101101" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Base di partenza" }), {
      target: { value: "2" },
    });
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("filtra gli strumenti Elettronica e calcola la tensione con la legge di Ohm", () => {
    render(<StudyToolsShop />);
    fireEvent.click(screen.getByRole("button", { name: "Elettronica" }));
    expect(screen.getByRole("button", { name: "Apri Legge di Ohm" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Convertitore di basi/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Apri Legge di Ohm" }));
    fireEvent.change(screen.getByLabelText("Corrente (A)"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Resistenza (Ω)"), { target: { value: "10" } });
    expect(screen.getByRole("status", { name: "Risultato: Tensione 20 V" })).toBeInTheDocument();
    expect(localStorage.getItem(TRACK_KEY)).toBe("elettronica");
  });

  it("ripristina l’indirizzo scelto dal dispositivo", () => {
    localStorage.setItem(TRACK_KEY, "elettronica");
    render(<StudyToolsShop />);
    expect(screen.getByRole("button", { name: "Elettronica" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Legge di Ohm" })).toBeInTheDocument();
  });
});
