import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClassroomSeatingTool } from "@/components/voto/ClassroomSeatingTool";

const STORAGE_KEY = "voto.studio.classroom-seating.v1";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Piantina della classe", () => {
  it("assegna un elenco ai primi posti liberi e salva la piantina localmente", () => {
    render(<ClassroomSeatingTool />);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Elenco dei nomi da assegnare ai posti" }),
      {
        target: { value: "Giulia Rossi\nLuca Bianchi" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Assegna ai posti liberi" }));

    expect(screen.getByRole("textbox", { name: "Nome alunno, fila 1, posto 1" })).toHaveValue(
      "Giulia Rossi",
    );
    expect(screen.getByRole("textbox", { name: "Nome alunno, fila 1, posto 2" })).toHaveValue(
      "Luca Bianchi",
    );
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Giulia Rossi");
  });

  it("permette di modificare i posti direttamente e di aumentare le file", () => {
    render(<ClassroomSeatingTool />);

    fireEvent.change(screen.getByRole("textbox", { name: "Nome alunno, fila 1, posto 1" }), {
      target: { value: "Sara Verdi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aumenta file" }));

    expect(
      screen.getByRole("textbox", { name: "Nome alunno, fila 6, posto 21" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Sara Verdi");
  });

  it("ripristina i nomi e la disposizione salvata sul dispositivo", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        className: "2ª A",
        rows: 3,
        desksPerRow: 2,
        centralAisle: true,
        assignments: { "0-0": "Marta Neri" },
      }),
    );

    render(<ClassroomSeatingTool />);

    expect(screen.getByRole("textbox", { name: "Nome della classe" })).toHaveValue("2ª A");
    expect(screen.getByRole("textbox", { name: "Nome alunno, fila 1, posto 1" })).toHaveValue(
      "Marta Neri",
    );
    expect(screen.getByRole("checkbox", { name: "Corridoio centrale" })).toBeChecked();
    expect(screen.queryByRole("textbox", { name: "Nome alunno, fila 4, posto 7" })).toBeNull();
  });
});
