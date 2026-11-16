import { ArrowLeft, Check, ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  APP_ICONS,
  APP_ICON_LABELS,
  chooseCustomAppIcon,
  getAppIcon,
  isAndroidAppIconSupported,
  setCustomAppIconName,
  setCustomShortcutNameVisibility,
  setAppIcon,
  type AppIconId,
  type AppIconLabelId,
} from "@/lib/voto/app-icon";
import { SectionTitle } from "@/components/voto/ui";

const ICON_PREVIEWS: Record<AppIconId, string> = {
  voto: "/icon-192.png",
  famiglia: "/app-icons/voto-family.png",
  classeviva: "/app-icons/voto-classeviva.png",
};

export function AppIconPanel({ onBack }: { onBack: () => void }) {
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [galleryShortcutSupported, setGalleryShortcutSupported] = useState(false);
  const [customShortcutPinned, setCustomShortcutPinned] = useState(false);
  const [customIconDataUrl, setCustomIconDataUrl] = useState<string | null>(null);
  const [pinRequestPending, setPinRequestPending] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<AppIconId | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<AppIconLabelId | null>(null);
  const [customShortcutName, setCustomShortcutName] = useState("VOTO");
  const [savedCustomShortcutName, setSavedCustomShortcutName] = useState("VOTO");
  const [hideCustomShortcutName, setHideCustomShortcutName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingIcon, setSavingIcon] = useState<AppIconId | "gallery" | null>(null);

  useEffect(() => {
    let active = true;
    const supported = isAndroidAppIconSupported();
    setNativeAvailable(supported);
    if (!supported) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    void getAppIcon()
      .then((state) => {
        if (!active) return;
        setSelectedIcon(state.icon);
        setSelectedLabel(state.label);
        setGalleryShortcutSupported(state.galleryShortcutSupported);
        setCustomShortcutPinned(state.customShortcutPinned);
        setCustomShortcutName(state.customShortcutName);
        setSavedCustomShortcutName(state.customShortcutName);
        setHideCustomShortcutName(state.customShortcutNameHidden);
        setCustomIconDataUrl(state.customIconDataUrl ?? null);
      })
      .catch((error: unknown) => {
        if (active) {
          const message = error instanceof Error ? error.message : "Errore sconosciuto.";
          toast.error(`Impossibile leggere l’icona selezionata: ${message}`);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const chooseIcon = async (icon: AppIconId) => {
    setSavingIcon(icon);
    const label = selectedLabel ?? "voto";
    try {
      await setAppIcon(icon, label);
      setSelectedIcon(icon);
      setSelectedLabel(label);
      toast.success(`Icona ${APP_ICONS.find((option) => option.id === icon)!.label} aggiornata.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto.";
      toast.error(`Impossibile aggiornare l’icona: ${message}`);
    } finally {
      setSavingIcon(null);
    }
  };

  const chooseLabel = async (label: AppIconLabelId) => {
    if (!selectedIcon) return;
    setSavingIcon(selectedIcon);
    try {
      await setAppIcon(selectedIcon, label);
      setSelectedLabel(label);
      toast.success(
        `Nome aggiornato: ${APP_ICON_LABELS.find((option) => option.id === label)!.label}.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto.";
      toast.error(`Impossibile aggiornare il nome dell’icona: ${message}`);
    } finally {
      setSavingIcon(null);
    }
  };

  const chooseGalleryIcon = async () => {
    setSavingIcon("gallery");
    try {
      const result = await chooseCustomAppIcon(customShortcutName);
      setCustomShortcutName(result.name);
      if (result.customIconDataUrl) setCustomIconDataUrl(result.customIconDataUrl);
      if (result.status === "updated") {
        setCustomShortcutPinned(true);
        setPinRequestPending(false);
        setSavedCustomShortcutName(result.name);
        toast.success("Collegamento personalizzato aggiornato nella schermata Home.");
      } else if (result.status === "requested") {
        setPinRequestPending(true);
        toast.info("Conferma dal launcher per aggiungere il collegamento alla schermata Home.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto.";
      toast.error(`Impossibile creare il collegamento personalizzato: ${message}`);
    } finally {
      setSavingIcon(null);
    }
  };

  const saveCustomShortcutName = async () => {
    setSavingIcon("gallery");
    try {
      await setCustomAppIconName(customShortcutName);
      setSavedCustomShortcutName(customShortcutName.trim());
      toast.success("Nome del collegamento aggiornato.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto.";
      toast.error(`Impossibile aggiornare il nome del collegamento: ${message}`);
    } finally {
      setSavingIcon(null);
    }
  };

  const updateCustomShortcutNameVisibility = async (hideName: boolean) => {
    setSavingIcon("gallery");
    try {
      await setCustomShortcutNameVisibility(hideName);
      setHideCustomShortcutName(hideName);
      toast.success("Visibilità del testo aggiornata.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto.";
      toast.error(`Impossibile aggiornare la visibilità del testo: ${message}`);
    } finally {
      setSavingIcon(null);
    }
  };

  const busy = !nativeAvailable || loading || savingIcon !== null;

  return (
    <div className="pt-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="press flex h-9 w-9 items-center justify-center rounded-xl border border-border"
          aria-label="Torna indietro"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-2xl font-semibold">Icona app</h1>
      </div>
      <p className="mb-3 mt-4 text-[11px] text-muted-foreground">
        Scegli l’icona dell’app oppure crea un collegamento personale alla Home.
      </p>
      {!nativeAvailable && (
        <p
          role="status"
          className="mb-3 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground"
        >
          Le icone native e la galleria richiedono l’app Android aggiornata. Nel browser non è
          possibile cambiare l’icona o creare un collegamento alla Home.
        </p>
      )}
      {nativeAvailable && !loading && !galleryShortcutSupported && (
        <p
          role="status"
          className="mb-3 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground"
        >
          Il launcher di questo dispositivo non supporta i collegamenti personalizzati. Puoi
          comunque scegliere una delle icone incluse.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {APP_ICONS.map((icon) => {
          const selected = selectedIcon === icon.id;
          return (
            <button
              key={icon.id}
              type="button"
              aria-pressed={selected}
              disabled={busy}
              onClick={() => void chooseIcon(icon.id)}
              className={cn(
                "press card-surface flex min-h-36 flex-col items-center justify-center gap-2 p-3",
                selected && "border-primary ring-2 ring-primary/30",
                busy && "disabled:opacity-60",
              )}
            >
              <img
                src={ICON_PREVIEWS[icon.id]}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover"
              />
              <span className="font-semibold">{icon.label}</span>
              <span className="text-center text-[10px] text-muted-foreground">
                {icon.description}
              </span>
              {selected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[10px] font-semibold text-primary">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Selezionata
                </span>
              )}
            </button>
          );
        })}
        <section className="card-surface flex min-h-36 flex-col items-center justify-center gap-2 p-3 text-center">
          {customIconDataUrl ? (
            <img
              src={customIconDataUrl}
              alt="Anteprima dell’icona personalizzata"
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ImagePlus className="h-8 w-8" aria-hidden="true" />
            </span>
          )}
          <span className="font-semibold">Dalla galleria</span>
          <span className="text-center text-[10px] text-muted-foreground">
            Crea o aggiorna un collegamento Home
          </span>
          <button
            type="button"
            disabled={busy || !galleryShortcutSupported}
            onClick={() => void chooseGalleryIcon()}
            className="press rounded-lg border border-border px-3 py-2 text-[10px] font-semibold disabled:opacity-60"
          >
            {savingIcon === "gallery"
              ? "Apertura galleria…"
              : customShortcutPinned
                ? "Aggiorna collegamento"
                : "Scegli immagine"}
          </button>
          {customShortcutPinned && (
            <span className="text-[10px] font-semibold text-primary">
              Collegamento presente nella Home
            </span>
          )}
          {pinRequestPending && (
            <span role="status" className="text-[10px] text-muted-foreground">
              In attesa della conferma del launcher
            </span>
          )}
        </section>
      </div>
      <SectionTitle>Nome dell’icona dell’app</SectionTitle>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Scegli un’etichetta fissa per l’icona nativa attiva.
      </p>
      <div className="grid gap-2">
        {APP_ICON_LABELS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={selectedLabel === option.id}
            disabled={busy || selectedIcon === null}
            onClick={() => void chooseLabel(option.id)}
            className={cn(
              "press card-surface flex items-center justify-between gap-3 p-3 text-left text-xs font-semibold",
              selectedLabel === option.id && "border-primary ring-2 ring-primary/30",
              busy && "disabled:opacity-60",
            )}
          >
            {option.label}
            {selectedLabel === option.id && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[10px] text-primary">
                <Check className="h-3 w-3" aria-hidden="true" />
                Selezionata
              </span>
            )}
          </button>
        ))}
      </div>
      <SectionTitle>Nome del collegamento personale</SectionTitle>
      <section className="card-surface p-3">
        <label htmlFor="custom-shortcut-name" className="text-xs font-semibold">
          Testo mostrato sotto il collegamento Home
        </label>
        <input
          id="custom-shortcut-name"
          type="text"
          value={customShortcutName}
          maxLength={25}
          disabled={busy || !galleryShortcutSupported}
          onChange={(event) => setCustomShortcutName(event.target.value)}
          className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        <p className="mt-2 text-[10px] text-muted-foreground">
          Il nome personalizzato riguarda solo il collegamento creato dalla galleria.
        </p>
        {customShortcutPinned && customShortcutName.trim() !== savedCustomShortcutName && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveCustomShortcutName()}
            className="press mt-3 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-60"
          >
            Salva nome
          </button>
        )}
      </section>
      <SectionTitle>Aspetto del collegamento Home</SectionTitle>
      <section className="card-surface grid gap-3 p-3">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={hideCustomShortcutName}
            disabled={busy || !galleryShortcutSupported}
            onChange={(event) => void updateCustomShortcutNameVisibility(event.target.checked)}
          />
          Nascondi il testo sotto il collegamento
        </label>
        <p className="text-[10px] text-muted-foreground">
          Il simbolo piccolo sovrapposto all’icona è aggiunto dal launcher e può variare in base al
          dispositivo.
        </p>
      </section>
      {nativeAvailable && loading && (
        <p role="status" className="mt-3 text-center text-xs text-muted-foreground">
          Lettura delle icone disponibili…
        </p>
      )}
    </div>
  );
}
