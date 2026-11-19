import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  cancelOnDeviceLlmDownload,
  deleteOnDeviceLlm,
  downloadOnDeviceLlm,
  getOnDeviceLlmStatus,
  isOnDeviceLlmAvailable,
  type LocalLlmStatus,
} from "@/lib/native-local-llm";

const initial: LocalLlmStatus = {
  supported: false,
  state: "unsupported",
  downloadedBytes: 0,
  totalBytes: 0,
  progress: 0,
};
export function LocalModelSettings() {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!isOnDeviceLlmAvailable()) {
      setStatus(initial);
      return;
    }
    try {
      setStatus(await getOnDeviceLlmStatus());
    } catch (error) {
      setStatus({
        ...initial,
        supported: true,
        state: "error",
        errorMessage: error instanceof Error ? error.message : "Stato non disponibile",
      });
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!["downloading", "verifying"].includes(status.state)) return;
    const timer = window.setInterval(() => void refresh(), 900);
    return () => window.clearInterval(timer);
  }, [status.state, refresh]);
  const action = async (fn: () => Promise<void>) => {
    setBusy(true);
    let actionError = "";
    try {
      await fn();
    } catch (error) {
      actionError = error instanceof Error ? error.message : "Operazione non riuscita";
    } finally {
      await refresh();
      if (actionError) {
        setStatus((s: LocalLlmStatus) => ({ ...s, state: "error", errorMessage: actionError }));
      }
      setBusy(false);
    }
  };
  const supported = isOnDeviceLlmAvailable() && status.supported;
  const downloading = status.state === "downloading" || status.state === "verifying";
  const label: Record<LocalLlmStatus["state"], string> = {
    unsupported: "Non supportato su questo dispositivo/ABI",
    "not-installed": "Modello non installato",
    downloading: "Download in corso…",
    verifying: "Verifica del modello…",
    ready: "Modello pronto",
    error: status.errorMessage || "Si è verificato un errore",
  };
  return (
    <>
      <h2 className="mt-6 mb-2 text-sm font-semibold">AI sul telefono</h2>
      <section className="card-surface space-y-3 p-4" aria-label="Impostazioni AI sul telefono">
        <p className="text-sm font-medium">Qwen3 0.6B · circa 586 MiB</p>
        <p className="text-xs text-muted-foreground">
          Il modello è facoltativo, scaricato solo da qui e usato solo scegliendo AI telefono in
          Assistente. Il download usa circa 586 MiB di traffico (anche dati mobili) e richiede circa
          720 MiB liberi sul dispositivo. Domande e documenti restano sul telefono; non vengono
          inviati a Groq. Modello rilasciato con licenza Apache-2.0;{" "}
          <a
            href="https://huggingface.co/litert-community/Qwen3-0.6B/tree/8d42ab5f1db14cad987fac57aeb17d070f9e180d"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            fonte e termini del modello.
          </a>
        </p>
        <p role="status" className="text-xs">
          {label[status.state]}
          {status.totalBytes > 0 && downloading
            ? ` · ${Math.round(status.progress)}% (${(status.downloadedBytes / 1048576).toFixed(0)} / ${(status.totalBytes / 1048576).toFixed(0)} MiB)`
            : ""}
        </p>
        {downloading && (
          <progress
            className="w-full"
            max={100}
            value={status.progress}
            aria-label="Download modello"
          />
        )}
        {!supported && (
          <p className="text-xs text-muted-foreground">
            Questo dispositivo o ABI non è supportato dal bridge installato.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {supported && status.state !== "ready" && (
            <button
              className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50"
              disabled={busy || downloading}
              onClick={() => void action(downloadOnDeviceLlm)}
            >
              {status.state === "error" ? "Riprova download" : "Scarica modello"}
            </button>
          )}
          {downloading && (
            <button
              className="rounded-lg border px-3 py-2 text-xs"
              disabled={busy}
              onClick={() => void action(cancelOnDeviceLlmDownload)}
            >
              Annulla
            </button>
          )}
          {supported && status.state === "ready" && (
            <button
              className="rounded-lg border px-3 py-2 text-xs"
              disabled={busy}
              onClick={() => void action(deleteOnDeviceLlm)}
            >
              Elimina modello
            </button>
          )}
          <button
            className="rounded-lg border px-3 py-2 text-xs"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Aggiorna stato
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Per selezionare il modello:{" "}
          <Link className="text-primary underline" to="/assistente">
            apri Assistente
          </Link>{" "}
          e scegli AI telefono. Il download non parte automaticamente.
        </p>
      </section>
    </>
  );
}
