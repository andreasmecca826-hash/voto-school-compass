import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

    expect(screen.getByRole("document", { name: "allegato.pdf" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scarica PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Riassumi sul dispositivo" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Fai una domanda alla circolare" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Solo quando premi Chiedi/i)).toBeInTheDocument();
    expect(screen.getByText(/domanda corrente/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chiedi" })).toBeDisabled();
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
    expect(screen.getByRole("button", { name: "Riassumi sul dispositivo" })).toBeInTheDocument();
  });

  it("preferisce il path PDF interno al duplicato esterno", () => {
    const path = `circulars/${"c".repeat(64)}.pdf`;
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare con allegati misti"
        fileName="circolare.pdf"
        path={path}
        url={undefined}
        attachments={[{ name: "circolare.pdf", url: "https://example.invalid/file.pdf" }]}
      />,
    );

    expect(screen.getByRole("document", { name: "circolare.pdf" })).toBeInTheDocument();
  });

  it("permette di passare da un allegato all’altro nella stessa circolare", () => {
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare con due allegati"
        fileName={undefined}
        path={undefined}
        url={undefined}
        attachments={[
          { name: "primo.pdf", path: `circulars/${"d".repeat(64)}.pdf` },
          { name: "secondo.pdf", path: `circulars/${"e".repeat(64)}.pdf` },
        ]}
      />,
    );

    const secondAttachmentTab = screen.getByRole("tab", { name: "secondo.pdf" });
    fireEvent.click(secondAttachmentTab);

    expect(secondAttachmentTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("document", { name: "secondo.pdf" })).toBeInTheDocument();
  });
});
