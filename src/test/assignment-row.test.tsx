import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AssignmentRow } from "@/components/voto/AssignmentRow";
import type { Assignment } from "@/lib/voto/types";

const state = vi.hoisted(() => ({
  done: false,
  toggleDone: vi.fn(),
}));

vi.mock("@/lib/voto/store", () => ({
  useVoto: () => ({
    isDone: () => state.done,
    toggleDone: state.toggleDone,
  }),
  useClock: () => new Date(2026, 10, 17, 12),
}));

const assignment: Assignment = {
  id: "assignment-1",
  title: "Studiare le equazioni",
  subject: "Matematica",
  dueDate: "2026-11-20",
  completed: false,
};

beforeEach(() => {
  state.done = false;
  state.toggleDone.mockReset();
});

afterEach(() => cleanup());

describe("toggle stato compito", () => {
  it("mostra lo stato corrente e invoca il toggle con il compito corretto", () => {
    const view = render(<AssignmentRow a={assignment} />);
    const toggle = screen.getByRole("switch", { name: "Stato del compito: Studiare le equazioni" });

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Da fare")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(state.toggleDone).toHaveBeenCalledWith("assignment-1", false);

    state.done = true;
    view.rerender(<AssignmentRow a={assignment} />);
    expect(
      screen.getByRole("switch", { name: "Stato del compito: Studiare le equazioni" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Fatto")).toBeInTheDocument();
    expect(screen.getByText("Completato")).toBeInTheDocument();
  });
});
