import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { UniversalCalculator } from "@/components/voto/UniversalCalculator";
import { Studio } from "@/routes/studio";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Calcolatore universale nello Studio Lab", () => {
  it("cerca uno strumento, calcola e mostra l’operazione nella cronologia locale", () => {
    render(<UniversalCalculator />);
    fireEvent.change(screen.getByRole("textbox", { name: "Cerca strumenti" }), {
      target: { value: "scientifica" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calcolatrice scientifica/ }));

    fireEvent.change(screen.getByRole("textbox", { name: "Espressione" }), {
      target: { value: "sqrt(81) + 2^3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Calcola" }));
    expect(screen.getByText("17")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tutti gli strumenti" }));
    expect(screen.getByRole("heading", { name: "Cronologia" })).toBeInTheDocument();
    expect(screen.getByText("sqrt(81) + 2^3")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(localStorage.getItem("voto.studio.universal-calculator.history.v1")).toContain(
      "sqrt(81) + 2^3",
    );
  });

  it("filtra gli strumenti anche per categoria", () => {
    render(<UniversalCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Conversioni" }));
    expect(screen.getByRole("button", { name: /Convertitore universale/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Generatore QR/ })).not.toBeInTheDocument();
  });

  it("mette i calcoli principali in Studio Lab e raccoglie gli strumenti studio nel calcolatore", () => {
    const { container } = render(<Studio />);
    const buttonLabels = () =>
      Array.from(container.querySelectorAll("button"), (button) => button.textContent ?? "");
    let labels = buttonLabels();
    expect(labels.some((label) => label.includes("Calcolo media"))).toBe(true);
    expect(labels.some((label) => label.includes("Calcolo assenze"))).toBe(true);
    expect(labels.some((label) => label.includes("Simulatore voti"))).toBe(true);
    expect(labels.some((label) => label.includes("Flashcard"))).toBe(false);
    expect(labels.some((label) => label.includes("Ruota del ripasso"))).toBe(false);

    const universalButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Calcolatore universale"),
    );
    if (!universalButton) throw new Error("Voce Calcolatore universale non trovata.");
    fireEvent.click(universalButton);
    labels = buttonLabels();
    for (const name of [
      "Importa da foto",
      "Flashcard",
      "Planner di studio",
      "Prima dell’interrogazione",
      "Ruota del ripasso",
    ]) {
      expect(labels.some((label) => label.includes(name))).toBe(true);
    }
    expect(labels.some((label) => label.includes("Calcolo media"))).toBe(false);
    expect(labels.some((label) => label.includes("Calcolo assenze"))).toBe(false);
    expect(labels.some((label) => label.includes("Simulatore voti"))).toBe(false);
  });
});
