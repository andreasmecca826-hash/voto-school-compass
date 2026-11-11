import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { UniversalCalculator } from "@/components/voto/UniversalCalculator";

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
});
