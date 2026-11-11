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

    expect(
      screen.getByRole("textbox", { name: "Nome alunno, fila 1, banco 1, posto 1" }),
    ).toHaveValue("Giulia Rossi");
    expect(
      screen.getByRole("textbox", { name: "Nome alunno, fila 1, banco 2, posto 2" }),
    ).toHaveValue("Luca Bianchi");
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Giulia Rossi");
  });

  it("permette di modificare i posti direttamente e di aumentare le file", () => {
    render(<ClassroomSeatingTool />);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Nome alunno, fila 1, banco 1, posto 1" }),
      { target: { value: "Sara Verdi" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Aumenta file" }));

    expect(
      screen.getByRole("textbox", { name: "Nome alunno, fila 6, banco 21, posto 21" }),
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
    expect(
      screen.getByRole("textbox", { name: "Nome alunno, fila 1, banco 1, posto 1" }),
    ).toHaveValue("Marta Neri");
    expect(screen.getByRole("checkbox", { name: "Corridoio centrale" })).toBeChecked();
    expect(
      screen.queryByRole("textbox", { name: "Nome alunno, fila 4, banco 7, posto 7" }),
    ).toBeNull();
  });

  it("attiva due posti per banco e applica la distanza scelta", () => {
    render(<ClassroomSeatingTool />);

    fireEvent.click(screen.getByRole("button", { name: "Banco a 2 posti" }));
    fireEvent.change(screen.getByRole("slider", { name: "Spazio tra i banchi" }), {
      target: { value: "24" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Elenco dei nomi da assegnare ai posti" }),
      { target: { value: "Ada Neri\nPietro Blu" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Assegna ai posti liberi" }));

    expect(
      screen.getByRole("textbox", { name: "Nome alunno, fila 1, banco 1, posto A" }),
    ).toHaveValue("Ada Neri");
    expect(
      screen.getByRole("textbox", { name: "Nome alunno, fila 1, banco 1, posto B" }),
    ).toHaveValue("Pietro Blu");
    expect(screen.getByRole("slider", { name: "Spazio tra i banchi" })).toHaveValue("24");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({
      seatsPerDesk: 2,
      spacing: 24,
    });
  });
});
