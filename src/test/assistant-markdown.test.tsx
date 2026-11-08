import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AssistantMarkdown } from "@/components/voto/AssistantMarkdown";

afterEach(cleanup);

describe("formattazione delle risposte dell’assistente", () => {
  it("mostra grassetto, corsivo ed elenchi Markdown", () => {
    render(
      <AssistantMarkdown text={"Ciao **mondo** e *scuola*\n\n- prima voce\n- seconda voce"} />,
    );

    expect(screen.getByText("mondo").tagName).toBe("STRONG");
    expect(screen.getByText("scuola").tagName).toBe("EM");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("non crea elementi HTML dai tag presenti nel testo", () => {
    render(<AssistantMarkdown text={'<img src=x onerror="alert(1)" />'} />);

    expect(document.querySelector("img")).toBeNull();
  });
});
