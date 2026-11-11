import { useState } from "react";
import {
  Download,
  FileText,
  ImagePlus,
  LoaderCircle,
  Plus,
  QrCode,
  Share2,
  Table2,
  Trash2,
} from "lucide-react";
import {
  extractCircularDocxText,
  extractCircularPdfText,
  renderCircularPdfPageImages,
} from "@/lib/voto/circular-reader";
import { createCsv, type UniversalToolId } from "@/lib/voto/universal-calculator";

type CreationToolId = Extract<UniversalToolId, "qr" | "documents" | "tables" | "share">;

const TOOL_INFO: Record<
  CreationToolId,
  { title: string; description: string; icon: typeof QrCode }
> = {
  qr: {
    title: "Generatore QR",
    description: "Crea un codice QR da un testo o un link. La generazione avviene nel browser.",
    icon: QrCode,
  },
  documents: {
    title: "Lettore documenti",
    description: "Estrai testo da PDF, Word, file di testo e immagini.",
    icon: FileText,
  },
  tables: {
    title: "Generatore tabelle",
    description: "Componi una tabella personalizzata e scaricala come file CSV.",
    icon: Table2,
  },
  share: {
    title: "Condivisione sicura compiti",
    description: "Prepara un messaggio con il solo compito che vuoi condividere.",
    icon: Share2,
  },
};

function SecureShareTool() {
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notice, setNotice] = useState("");
  const message = [
    subject.trim() && `Materia: ${subject.trim()}`,
    title.trim() && `Compito: ${title.trim()}`,
    content.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  async function share() {
    if (!message) {
      setNotice("Inserisci almeno il testo del compito.");
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: title.trim() || "Compito", text: message });
        setNotice("Condivisione completata.");
      } else {
        await navigator.clipboard.writeText(message);
        setNotice("Testo copiato: ora puoi incollarlo nell’app che preferisci.");
      }
    } catch {
      setNotice("Condivisione annullata o non disponibile.");
    }
  }

  return (
    <section className="card-surface space-y-3 p-4" aria-label="Condivisione sicura compiti">
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1 text-xs font-semibold">
          Materia
          <input
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Es. Matematica"
            maxLength={80}
          />
        </label>
        <label className="block space-y-1 text-xs font-semibold">
          Titolo
          <input
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Es. Esercizi pag. 42"
            maxLength={120}
          />
        </label>
      </div>
      <label className="block space-y-1 text-xs font-semibold">
        Testo del compito
        <textarea
          className="min-h-32 w-full rounded-lg border border-input bg-card p-3 text-sm font-normal"
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, 4000))}
          placeholder="Scrivi solo ciò che vuoi condividere…"
          maxLength={4000}
        />
      </label>
      <button
        type="button"
        onClick={share}
        disabled={!message}
        className="press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" /> Condividi compito
      </button>
      {notice && (
        <p role="status" className="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">
          {notice}
        </p>
      )}
      <p className="text-[10px] leading-4 text-muted-foreground">
        Il testo viene inviato solo quando premi il pulsante e non include automaticamente voti,
        assenze o dati dell’app. Non viene creato un link pubblico né salvato un archivio online.
      </p>
    </section>
  );
}

function useLocalOcr() {
  const [progress, setProgress] = useState(0);

  async function recognize(images: (File | string)[]): Promise<string[]> {
    setProgress(0);
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("ita", 1, {
      logger: (message) => {
        if (message.status === "recognizing text") {
          setProgress(Math.min(100, Math.max(0, Math.round(message.progress * 100))));
        }
      },
    });
    try {
      const output: string[] = [];
      for (const image of images) {
        const result = await worker.recognize(image);
        output.push(result.data.text.trim());
      }
      return output;
    } finally {
      await worker.terminate();
    }
  }

  return { recognize, progress };
}

function QrTool() {
  const [content, setContent] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!content.trim()) {
      setError("Scrivi un testo o un link da inserire nel codice QR.");
      setDataUrl("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const qrModule = await import("qrcode");
      const image = await qrModule.default.toDataURL(content.trim(), {
        width: 480,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#171717", light: "#ffffff" },
      });
      setDataUrl(image);
    } catch {
      setError("Non è stato possibile creare il codice QR. Controlla il testo e riprova.");
      setDataUrl("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface space-y-3 p-4" aria-label="Generatore QR">
      <label className="block space-y-1 text-xs font-semibold">
        Testo o link
        <textarea
          aria-label="Testo o link per il QR"
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, 2000))}
          placeholder="https://… oppure scrivi un messaggio"
          rows={4}
          maxLength={2000}
          className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="press min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Creo il codice…" : "Genera codice QR"}
      </button>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      {dataUrl && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-4">
          <img
            src={dataUrl}
            alt="Codice QR generato"
            className="h-56 w-56 max-w-full object-contain"
          />
          <a
            href={dataUrl}
            download="codice-qr.png"
            className="press inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" /> Scarica PNG
          </a>
        </div>
      )}
      <p className="text-[10px] leading-4 text-muted-foreground">
        Prima di condividere un QR, verifica sempre che il contenuto non includa dati privati.
      </p>
    </section>
  );
}

function DocumentReaderTool() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ocr = useLocalOcr();

  async function extract() {
    if (!file) {
      setError("Scegli prima un documento o un’immagine.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("Il file supera il limite di 25 MB.");
      return;
    }
    const extension = file.name.toLocaleLowerCase("it-IT").split(".").pop() ?? "";
    setBusy(true);
    setError("");
    setNotice("");
    setText("");
    try {
      if (extension === "pdf") {
        const objectUrl = URL.createObjectURL(file);
        try {
          const document = await extractCircularPdfText(objectUrl);
          const selectableText = document.text.replace(/^\[Pagina \d+\]\s*/gm, "").trim();
          if (selectableText) {
            setText(selectableText);
            setNotice(
              document.truncated
                ? `Testo estratto da ${document.pagesAnalyzed} pagine (risultato abbreviato).`
                : `Testo estratto da ${document.pagesAnalyzed} pagine.`,
            );
          } else {
            setNotice("Il PDF sembra una scansione: avvio l’OCR locale sulle prime pagine.");
            const visual = await renderCircularPdfPageImages(objectUrl);
            if (!visual.pages.length)
              throw new Error("Non è stato possibile leggere le pagine del PDF.");
            const recognized = await ocr.recognize(visual.pages.map((page) => page.dataUrl));
            const extracted = recognized
              .filter(Boolean)
              .map(
                (pageText, index) =>
                  `[Pagina ${visual.pages[index]?.pageNumber ?? index + 1}]\n${pageText}`,
              )
              .join("\n\n");
            setText(extracted || "Nessun testo riconosciuto.");
            setNotice(
              visual.truncated
                ? `OCR sulle prime ${visual.pages.length} pagine; il PDF ne contiene ${visual.totalPages}.`
                : `OCR completato su ${visual.pages.length} pagine.`,
            );
          }
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      } else if (extension === "docx") {
        const objectUrl = URL.createObjectURL(file);
        try {
          const document = await extractCircularDocxText(objectUrl);
          setText(document.text || "Nessun testo trovato nel documento.");
          setNotice(
            document.truncated
              ? "Testo estratto (risultato abbreviato)."
              : "Testo estratto dal documento Word.",
          );
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      } else if (["txt", "md", "csv", "log"].includes(extension)) {
        const value = await file.text();
        setText(value || "Il file è vuoto.");
        setNotice("File di testo letto sul dispositivo.");
      } else if (
        ["png", "jpg", "jpeg", "webp", "bmp", "gif"].includes(extension) ||
        file.type.startsWith("image/")
      ) {
        const [recognized] = await ocr.recognize([file]);
        setText(recognized || "Nessun testo riconosciuto.");
        setNotice(
          "OCR eseguito nel browser. Controlla sempre il risultato, soprattutto per numeri e date.",
        );
      } else {
        throw new Error("Formato non supportato. Scegli PDF, DOCX, TXT, MD, CSV o un’immagine.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Non è stato possibile leggere il file.");
    } finally {
      setBusy(false);
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Testo copiato negli appunti.");
    } catch {
      setError(
        "Il browser non consente di copiare automaticamente. Seleziona il testo e copialo manualmente.",
      );
    }
  }

  return (
    <section className="card-surface space-y-3 p-4" aria-label="Lettore documenti">
      <label className="block space-y-1 text-xs font-semibold">
        Documento o immagine
        <input
          aria-label="Scegli documento o immagine"
          type="file"
          accept=".pdf,.docx,.txt,.md,.csv,.log,image/*"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setText("");
            setError("");
            setNotice("");
          }}
          className="block min-h-12 w-full rounded-lg border border-input bg-card px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary"
        />
      </label>
      {file && (
        <p className="break-all text-[11px] text-muted-foreground">
          {file.name} ·{" "}
          {(file.size / (1024 * 1024)).toLocaleString("it-IT", { maximumFractionDigits: 1 })} MB
        </p>
      )}
      <button
        type="button"
        onClick={extract}
        disabled={busy || !file}
        className="press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" /> Lettura in corso…
          </>
        ) : (
          "Estrai testo"
        )}
      </button>
      {busy && (
        <p aria-live="polite" className="text-[11px] text-muted-foreground">
          {ocr.progress > 0 ? `OCR in corso: ${ocr.progress}%` : "Preparazione dell’estrazione…"}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      {text && (
        <>
          <label className="block space-y-1 text-xs font-semibold">
            Testo estratto
            <textarea
              readOnly
              value={text}
              rows={12}
              className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-xs font-normal leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <button
            type="button"
            onClick={copyText}
            className="press min-h-10 w-full rounded-lg border border-border bg-card px-4 text-xs font-semibold"
          >
            Copia testo
          </button>
        </>
      )}
      <p className="flex gap-2 rounded-lg bg-surface p-3 text-[10px] leading-4 text-muted-foreground">
        <ImagePlus className="mt-0.5 h-3.5 w-3.5 shrink-0" /> I file vengono elaborati nel browser e
        non caricati nell’app. Al primo OCR potrebbe essere necessario scaricare il motore e il
        modello italiano; le scansioni PDF sono limitate alle prime 4 pagine.
      </p>
    </section>
  );
}

function TableGeneratorTool() {
  const [headers, setHeaders] = useState(["Colonna 1", "Colonna 2", "Colonna 3"]);
  const [rows, setRows] = useState<string[][]>([
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ]);
  const [notice, setNotice] = useState("");

  function updateHeader(index: number, value: string) {
    setHeaders((current) => current.map((header, column) => (column === index ? value : header)));
  }

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    setRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? row.map((cell, column) => (column === columnIndex ? value : cell))
          : row,
      ),
    );
  }

  function addColumn() {
    if (headers.length >= 8) return;
    const next = headers.length + 1;
    setHeaders((current) => [...current, `Colonna ${next}`]);
    setRows((current) => current.map((row) => [...row, ""]));
  }

  function removeColumn() {
    if (headers.length <= 1) return;
    setHeaders((current) => current.slice(0, -1));
    setRows((current) => current.map((row) => row.slice(0, -1)));
  }

  function addRow() {
    if (rows.length >= 25) return;
    setRows((current) => [...current, Array.from({ length: headers.length }, () => "")]);
  }

  function download() {
    try {
      const csv = createCsv(headers, rows);
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tabella.csv";
      link.click();
      URL.revokeObjectURL(url);
      setNotice("File CSV scaricato.");
    } catch (caught) {
      setNotice(
        caught instanceof Error ? caught.message : "Non è stato possibile esportare la tabella.",
      );
    }
  }

  return (
    <section className="card-surface space-y-3 p-4" aria-label="Generatore tabelle">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addColumn}
          disabled={headers.length >= 8}
          className="press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Colonna
        </button>
        <button
          type="button"
          onClick={removeColumn}
          disabled={headers.length <= 1}
          className="press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Ultima colonna
        </button>
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= 25}
          className="press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Riga
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[420px] border-collapse text-left text-xs">
          <thead className="bg-surface">
            <tr>
              {headers.map((header, columnIndex) => (
                <th key={columnIndex} className="border-b border-r border-border p-1.5">
                  <input
                    aria-label={`Intestazione colonna ${columnIndex + 1}`}
                    value={header}
                    onChange={(event) => updateHeader(columnIndex, event.target.value)}
                    className="h-9 w-full min-w-24 rounded-md border border-input bg-card px-2 font-semibold"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, columnIndex) => (
                  <td key={columnIndex} className="border-b border-r border-border p-1.5">
                    <input
                      aria-label={`Riga ${rowIndex + 1}, colonna ${columnIndex + 1}`}
                      value={cell}
                      onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                      className="h-9 w-full min-w-24 rounded-md border border-input bg-card px-2"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={download}
        className="press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        <Download className="h-4 w-4" /> Esporta CSV
      </button>
      {notice && (
        <p role="status" className="text-xs text-primary">
          {notice}
        </p>
      )}
      <p className="text-[10px] leading-4 text-muted-foreground">
        Massimo 8 colonne e 25 righe. Il CSV usa il separatore punto e virgola per aprirsi
        correttamente con le impostazioni italiane dei fogli di calcolo.
      </p>
    </section>
  );
}

export function UniversalCreationPanel({ tool }: { tool: CreationToolId }) {
  const metadata = TOOL_INFO[tool];
  const Icon = metadata.icon;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/60 via-card to-card p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold">{metadata.title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{metadata.description}</p>
      </section>
      {tool === "qr" && <QrTool />}
      {tool === "documents" && <DocumentReaderTool />}
      {tool === "tables" && <TableGeneratorTool />}
      {tool === "share" && <SecureShareTool />}
    </div>
  );
}
