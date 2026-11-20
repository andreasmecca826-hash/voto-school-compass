import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  cancelOnDeviceLlmDownload,
  deleteOnDeviceLlm,
  downloadOnDeviceLlm,
  getLocalModelCatalog,
  getOnDeviceLlmStatus,
  getSelectedLocalModel,
  isOnDeviceLlmAvailable,
  selectLocalModel,
  type LocalLlmStatus,
  type LocalModelId,
  type LocalModelInfo,
} from "@/lib/native-local-llm";

const formatBytes = (bytes: number) =>
  `${(bytes / 1073741824).toFixed(bytes >= 1073741824 ? 1 : 2)} GB`;
const initialStatus = (model: LocalModelInfo): LocalLlmStatus => ({
  modelId: model.id,
  supported: false,
  state: "unsupported",
  downloadedBytes: 0,
  totalBytes: model.sizeBytes,
  requiredFreeBytes: model.requiredFreeBytes,
  availableBytes: 0,
  progress: 0,
});

export function LocalModelSettings() {
  const [models, setModels] = useState<LocalModelInfo[]>([]);
  const [statuses, setStatuses] = useState<Record<string, LocalLlmStatus>>({});
  const [selected, setSelected] = useState<LocalModelId | null>(null);
  const [busy, setBusy] = useState<LocalModelId | null>(null);

  const refresh = useCallback(async () => {
    const catalog = await getLocalModelCatalog();
    setModels(catalog);
    const next = await Promise.all(
      catalog.map(async (model) => [model.id, await getOnDeviceLlmStatus(model.id)] as const),
    );
    setStatuses(Object.fromEntries(next));
    if (isOnDeviceLlmAvailable()) setSelected(await getSelectedLocalModel());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (
      !Object.values(statuses).some((status) => ["downloading", "verifying"].includes(status.state))
    )
      return;
    const timer = window.setInterval(() => void refresh(), 1000);
    return () => window.clearInterval(timer);
  }, [statuses, refresh]);

  const action = async (modelId: LocalModelId, operation: () => Promise<void>) => {
    setBusy(modelId);
    try {
      await operation();
    } finally {
      await refresh();
      setBusy(null);
    }
  };

  const labelFor = (status: LocalLlmStatus) =>
    ({
      unsupported: "Non disponibile su questo dispositivo",
      "not-installed": "Non scaricata",
      downloading: "Download in corso…",
      verifying: "Verifica file…",
      ready: "Pronta offline",
      error: status.errorMessage || "Errore download",
    })[status.state];

  return (
    <>
      <h2 className="mt-6 mb-2 text-sm font-semibold">AI sul telefono</h2>
      <section className="card-surface space-y-3 p-4" aria-label="Impostazioni AI sul telefono">
        <p className="text-xs text-muted-foreground">
          Quattro modelli LiteRT-LM separati: nessuno viene inserito nell’APK. Il peso indicato è lo
          spazio del file; durante il download viene mostrato anche lo spazio libero rilevato.
        </p>
        <div className="space-y-3">
          {models.map((model) => {
            const status = statuses[model.id] ?? initialStatus(model);
            const downloading = status.state === "downloading" || status.state === "verifying";
            const isBusy = busy === model.id;
            return (
              <article
                key={model.id}
                className={`rounded-xl border p-3 ${selected === model.id ? "border-primary bg-primary-soft/30" : "border-border"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{model.label}</p>
                      {selected === model.id && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                          Selezionata
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-medium">{model.modelName}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Download/spazio: <strong>{formatBytes(model.sizeBytes)}</strong> · consigliati{" "}
                      {formatBytes(model.requiredFreeBytes)} liberi.
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {model.compatibility}. Licenza: {model.license}.
                    </p>
                    {model.note && <p className="mt-1 text-[10px] text-warning">{model.note}</p>}
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {status.availableBytes ? `${formatBytes(status.availableBytes)} liberi` : ""}
                  </span>
                </div>
                <p role="status" className="mt-2 text-[11px]">
                  {labelFor(status)}
                  {downloading && status.totalBytes > 0
                    ? ` · ${Math.round(status.progress * 100)}% (${formatBytes(status.downloadedBytes)} / ${formatBytes(status.totalBytes)})`
                    : ""}
                </p>
                {downloading && (
                  <progress
                    className="mt-1 w-full"
                    max={1}
                    value={status.progress}
                    aria-label={`Download ${model.label}`}
                  />
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {status.state === "ready" && (
                    <button
                      type="button"
                      className="rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                      disabled={isBusy || selected === model.id}
                      onClick={() =>
                        void action(model.id, async () => {
                          await selectLocalModel(model.id);
                          setSelected(model.id);
                        })
                      }
                    >
                      {selected === model.id ? "In uso" : "Usa questo modello"}
                    </button>
                  )}
                  {status.state !== "ready" &&
                    status.state !== "downloading" &&
                    status.state !== "verifying" && (
                      <button
                        type="button"
                        className="rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                        disabled={isBusy || !isOnDeviceLlmAvailable()}
                        onClick={() => void action(model.id, () => downloadOnDeviceLlm(model.id))}
                      >
                        {status.state === "error" ? "Riprova download" : "Scarica modello"}
                      </button>
                    )}
                  {downloading && (
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2 text-[11px] disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() =>
                        void action(model.id, () => cancelOnDeviceLlmDownload(model.id))
                      }
                    >
                      Annulla
                    </button>
                  )}
                  {status.state === "ready" && (
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2 text-[11px] disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => void action(model.id, () => deleteOnDeviceLlm(model.id))}
                    >
                      Elimina
                    </button>
                  )}
                </div>
                {!isOnDeviceLlmAvailable() && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Il download e l’uso offline si attivano nell’app Android. Il modello Ultra
                    Leggera è pensato per dispositivi con poca RAM.
                  </p>
                )}
              </article>
            );
          })}
        </div>
        <button
          type="button"
          className="rounded-lg border px-3 py-2 text-[11px]"
          onClick={() => void refresh()}
        >
          Aggiorna stato
        </button>
        <p className="text-[11px] text-muted-foreground">
          Dopo aver scaricato e selezionato un modello, apri{" "}
          <Link className="text-primary underline" to="/assistente">
            Assistente
          </Link>{" "}
          e scegli “Locale”. L’API Groq resta invariata e continua a funzionare come prima.
        </p>
      </section>
    </>
  );
}
