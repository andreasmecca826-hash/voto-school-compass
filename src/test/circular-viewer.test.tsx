import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CircularViewer } from "@/components/voto/CircularViewer";

afterEach(cleanup);

describe("visualizzatore PDF delle circolari interne", () => {
  it("mantiene anteprima locale e download anche senza URL firmata anticipata", () => {
    const path = `circulars/${"a".repeat(64)}.pdf`;
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare interna"
        fileName="allegato.pdf"
        path={path}
        url={undefined}
      />,
    );

    expect(screen.getByTitle("allegato.pdf")).toHaveAttribute(
      "src",
      `/api/circulars/mirror?path=${encodeURIComponent(path)}`,
    );
    expect(screen.getByRole("button", { name: "Scarica PDF" })).toBeInTheDocument();
  });

  it("offre apertura e download separati per un DOCX", () => {
    const path = `circulars/${"b".repeat(64)}.docx`;
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare DOCX"
        fileName="modulo.docx"
        path={path}
        url={undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Apri DOCX" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scarica DOCX" })).toBeInTheDocument();
  });
});
