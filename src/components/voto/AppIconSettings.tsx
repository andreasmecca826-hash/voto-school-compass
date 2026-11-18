import { useEffect, useState } from "react";
import { Check, LoaderCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getNativeAppIcon,
  isAndroidApp,
  setNativeAppIcon,
  type AppIconName,
} from "@/lib/native-app-icon";

const ICONS: {
  id: AppIconName;
  label: string;
  description: string;
  background: string;
  foreground: string;
  dot: string;
}[] = [
  {
    id: "classic",
    label: "VOTO classica",
    description: "Nera e corallo",
    background: "#090909",
    foreground: "#ffffff",
    dot: "#e85d5d",
  },
  {
    id: "light",
    label: "Carta",
    description: "Chiara e minimale",
    background: "#f4f4f2",
    foreground: "#171717",
    dot: "#e85d5d",
  },
  {
    id: "ocean",
    label: "Oceano",
    description: "Blu profondo e azzurro",
    background: "#123e70",
    foreground: "#ffffff",
    dot: "#75d3ff",
  },
  {
    id: "violet",
    label: "Viola",
    description: "Prugna e lilla",
    background: "#402553",
    foreground: "#ffffff",
    dot: "#e7b5ff",
  },
];

export function AppIconSettings() {
  const [selected, setSelected] = useState<AppIconName>("classic");
  const [busy, setBusy] = useState<AppIconName | null>(null);
  const [loading, setLoading] = useState(true);
  const android = isAndroidApp();

  useEffect(() => {
    if (!android) {
      setLoading(false);
      return;
    }
    let active = true;
    void getNativeAppIcon()
      .then((result) => {
        if (active && result) setSelected(result.name);
      })
      .catch(() => {
        if (active) toast.error("Non riesco a leggere l’icona attiva su questo dispositivo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [android]);

  async function chooseIcon(name: AppIconName) {
    if (!android || name === selected || busy) return;
    setBusy(name);
    try {
      const result = await setNativeAppIcon(name);
      setSelected(result.name);
      toast.success("Icona VOTO aggiornata", {
        description: "La Home del telefono potrebbe impiegare qualche secondo per mostrarla.",
      });
    } catch (error) {
      toast.error("Cambio icona non riuscito", {
        description:
          error instanceof Error ? error.message : "Riprova dall’app Android aggiornata.",
      });
    } finally {
      setBusy(null);
    }
  }

  if (!android) {
    return (
      <section className="card-surface flex items-start gap-3 p-4">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Icona della Home del telefono</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Il cambio dell’icona richiede l’app Android installata; dalla Web App puoi solo
            visualizzare questa sezione.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="card-surface p-4">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Icona nella schermata Home</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            Scegli l’icona VOTO che vedrai nella Home e nel cassetto app. Il cambio avviene senza
            reinstallare l’app.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {ICONS.map((icon) => {
          const active = selected === icon.id;
          const changing = busy === icon.id;
          return (
            <button
              key={icon.id}
              type="button"
              aria-pressed={active}
              disabled={loading || busy !== null}
              onClick={() => void chooseIcon(icon.id)}
              className={cn(
                "press flex min-h-[112px] items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors",
                active && "border-primary ring-2 ring-primary/30",
                (loading || busy !== null) && "disabled:cursor-wait disabled:opacity-60",
              )}
            >
              <span
                aria-hidden="true"
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] text-[27px] font-semibold tracking-[-0.08em] shadow-sm"
                style={{ backgroundColor: icon.background, color: icon.foreground }}
              >
                V
                <span
                  className="ml-0.5 self-end pb-[8px] text-[20px] leading-none"
                  style={{ color: icon.dot }}
                >
                  .
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{icon.label}</span>
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {icon.description}
                </span>
                {active && (
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                    <Check className="h-3 w-3" /> Attiva
                  </span>
                )}
                {changing && (
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <LoaderCircle className="h-3 w-3 animate-spin" /> Aggiorno…
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
        Il supporto al cambio dinamico viene installato con l’APK aggiornato; da quel momento le
        icone si cambiano qui senza un’altra reinstallazione.
      </p>
    </section>
  );
}
