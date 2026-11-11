import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudyPlannerTool } from "@/components/voto/StudyPlannerTool";

vi.mock("@/lib/voto/store", () => ({
  useVoto: () => ({
    data: {
      subjects: [{ name: "Matematica" }],
      assignments: [],
    },
    interrogazioni: [],
  }),
  useClock: () => new Date(2026, 10, 11, 12),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Planner di studio manuale", () => {
  it("aggiunge, salva e completa una sessione scelta dall'utente", () => {
    render(<StudyPlannerTool />);

    expect(screen.getByRole("heading", { name: "Planner di studio" })).toBeInTheDocument();
    expect(screen.queryByText("Da registro")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Argomento o obiettivo" }), {
      target: { value: "Ripassare le equazioni" },
    });
    fireEvent.change(screen.getByLabelText("Materia"), {
      target: { value: "Matematica" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Metodo di studio" }), {
      target: { value: "esercizi" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Durata in minuti" }), {
      target: { value: "60" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi" }));

    expect(screen.getByText("Ripassare le equazioni")).toBeInTheDocument();
    expect(screen.getByText("Esercizi · Matematica")).toBeInTheDocument();
    const saved = JSON.parse(
      localStorage.getItem("voto.study-planner.manual-tasks.v1") ?? "[]",
    ) as Array<Record<string, unknown>>;
    expect(saved[0]).toMatchObject({
      title: "Ripassare le equazioni",
      subject: "Matematica",
      method: "esercizi",
      date: "2026-11-11",
      startTime: "16:00",
      minutes: 60,
      completed: false,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Segna completata: Ripassare le equazioni" }),
    );
    expect(
      screen.getByRole("button", { name: "Segna da fare: Ripassare le equazioni" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fatto")).toBeInTheDocument();
  });

  it("mantiene le sessioni precedenti convertendo le attività salvate dal planner smart", () => {
    localStorage.setItem(
      "voto.study-planner.manual-tasks.v1",
      JSON.stringify([
        {
          id: "legacy-1",
          title: "Preparare la verifica",
          subject: "Scienze",
          kind: "verifica",
          date: "2026-11-12",
          minutes: 45,
          completed: false,
        },
      ]),
    );

    render(<StudyPlannerTool />);

    expect(screen.getByText("Preparazione verifica/interrogazione · Scienze")).toBeInTheDocument();
    expect(screen.getByText("16:00 · 45 min")).toBeInTheDocument();
  });
});
