import {
  Check,
  Link,
  Music2,
  Pause,
  Play,
  Repeat,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SectionTitle } from "@/components/voto/ui";
import { load, save } from "@/lib/voto/storage";
import { loadLocalTrack, removeLocalTrack, saveLocalTrack } from "@/lib/voto/music-storage";

const MUSIC_URL_KEY = "voto.music.url";
const MUSIC_AUTOPLAY_KEY = "voto.music.autoplay";
const MUSIC_LOOP_KEY = "voto.music.loop";
const MUSIC_VOLUME_KEY = "voto.music.volume";

function fileLabel(file: File | Blob): string {
  return file instanceof File && file.name ? file.name : "Brano salvato sul dispositivo";
}

function youtubeVideoId(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1) || null;
    if (
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "music.youtube.com"
    ) {
      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

export function MusicPanel({ onBack }: { onBack: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [url, setUrl] = useState(() => load<string>(MUSIC_URL_KEY, ""));
  const [urlInput, setUrlInput] = useState(() => load<string>(MUSIC_URL_KEY, ""));
  const [localTrack, setLocalTrack] = useState<File | Blob | null>(null);
  const [source, setSource] = useState<string | null>(() => load<string>(MUSIC_URL_KEY, "") || null);
  const [trackName, setTrackName] = useState(() =>
    load<string>(MUSIC_URL_KEY, "") ? "Brano da URL" : "Nessun brano selezionato",
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => load<number>(MUSIC_VOLUME_KEY, 0.8));
  const [loop, setLoop] = useState(() => load<boolean>(MUSIC_LOOP_KEY, false));
  const [autoplay, setAutoplay] = useState(() => load<boolean>(MUSIC_AUTOPLAY_KEY, false));
  const [loading, setLoading] = useState(true);
  const youtubeId = source ? youtubeVideoId(source) : null;
  const youtubeEmbedUrl = youtubeId
    ? `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?controls=1&rel=0${autoplay ? "&autoplay=1" : ""}${loop ? `&loop=1&playlist=${encodeURIComponent(youtubeId)}` : ""}`
    : null;

  useEffect(() => {
    let cancelled = false;
    void loadLocalTrack()
      .then((track) => {
        if (!cancelled && track) {
          setLocalTrack(track);
          if (!url) {
            const nextUrl = URL.createObjectURL(track);
            objectUrlRef.current = nextUrl;
            setSource(nextUrl);
            setTrackName(fileLabel(track));
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.loop = loop;
  }, [volume, loop, source]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const setAudioSource = (nextSource: string | null, name: string) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSource(nextSource);
    setTrackName(name);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  };

  const chooseLocalFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast.error("Seleziona un file audio.");
      return;
    }
    try {
      await saveLocalTrack(file);
      setLocalTrack(file);
      const nextUrl = URL.createObjectURL(file);
      objectUrlRef.current = nextUrl;
      setAudioSource(nextUrl, file.name);
      toast.success("Brano salvato sul dispositivo");
    } catch {
      toast.error("Non è stato possibile salvare il brano.");
    }
  };

  const useUrl = () => {
    const nextUrl = urlInput.trim();
    if (!nextUrl) {
      toast.error("Inserisci un URL audio.");
      return;
    }
    try {
      const parsed = new URL(nextUrl);
      if (parsed.protocol !== "https:") throw new Error("https");
    } catch {
      toast.error("Inserisci un URL https valido.");
      return;
    }
    save(MUSIC_URL_KEY, nextUrl);
    setUrl(nextUrl);
    setAudioSource(nextUrl, "Brano da URL");
    toast.success("URL musicale salvato");
  };

  const useLocalTrack = () => {
    if (!localTrack) return;
    const nextUrl = URL.createObjectURL(localTrack);
    objectUrlRef.current = nextUrl;
    setAudioSource(nextUrl, fileLabel(localTrack));
  };

  const clearAll = async () => {
    await removeLocalTrack().catch(() => undefined);
    save(MUSIC_URL_KEY, null);
    setUrl("");
    setUrlInput("");
    setLocalTrack(null);
    setAudioSource(null, "Nessun brano selezionato");
    toast.success("Musica rimossa");
  };

  const togglePlayback = async () => {
    if (youtubeId) {
      toast("Usa i controlli del player YouTube per avviare o mettere in pausa.");
      return;
    }
    const audio = audioRef.current;
    if (!audio || !source) {
      toast("Scegli prima un file o un URL audio.");
      return;
    }
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        toast.error("Il browser non ha avviato la riproduzione.");
      }
    } else {
      audio.pause();
    }
  };

  const toggleAutoplay = () => {
    const next = !autoplay;
    setAutoplay(next);
    save(MUSIC_AUTOPLAY_KEY, next);
  };

  const toggleLoop = () => {
    const next = !loop;
    setLoop(next);
    save(MUSIC_LOOP_KEY, next);
  };

  return (
    <div className="pt-3">
      <button type="button" onClick={onBack} className="mb-5 text-sm font-semibold text-primary">
        ← Torna a Personalizza
      </button>
      <h1 className="font-display text-2xl font-semibold">Musica</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Scegli un brano dal dispositivo oppure usa un URL audio diretto.
      </p>

      <SectionTitle>Brano dal dispositivo</SectionTitle>
      <section className="card-surface p-4">
        <label className="press flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary-soft p-4 text-sm font-semibold">
          <Upload className="h-4 w-4" />
          Scegli file audio
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(event) => void chooseLocalFile(event.target.files?.[0])}
          />
        </label>
        <p className="mt-2 truncate text-[11px] text-muted-foreground">
          {localTrack ? fileLabel(localTrack) : "Il file resta salvato solo su questo dispositivo."}
        </p>
      </section>

      <SectionTitle>Brano da URL</SectionTitle>
      <section className="card-surface p-4">
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            placeholder="https://esempio.it/brano.mp3"
            type="url"
            className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-xs"
            aria-label="URL del brano audio"
          />
          <button
            type="button"
            onClick={useUrl}
            className="press flex h-10 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Link className="h-3.5 w-3.5" /> Usa
          </button>
        </div>
        {url && <p className="mt-2 truncate text-[11px] text-muted-foreground">URL salvato: {url}</p>}
      </section>

      <SectionTitle>Lettore</SectionTitle>
      <section className="card-surface p-4">
        {youtubeEmbedUrl && (
          <div className="overflow-hidden rounded-xl bg-black">
            <iframe
              src={youtubeEmbedUrl}
              title="Player YouTube Music"
              className="aspect-video w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        <audio
          ref={audioRef}
          src={youtubeId ? undefined : source ?? undefined}
          preload="metadata"
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration || 0);
            event.currentTarget.volume = volume;
            event.currentTarget.loop = loop;
            if (autoplay) void event.currentTarget.play().catch(() => undefined);
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
        {!youtubeId && (
          <>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Music2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{loading ? "Caricamento…" : trackName}</p>
            <p className="text-[11px] text-muted-foreground">
              {duration ? `${Math.floor(currentTime)} / ${Math.floor(duration)} secondi` : "Pronto"}
            </p>
          </div>
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? "Metti in pausa" : "Riproduci"}
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
        </div>
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.1"
          value={Math.min(currentTime, duration || 1)}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (audioRef.current) audioRef.current.currentTime = next;
            setCurrentTime(next);
          }}
          className="mt-4 w-full accent-primary"
          aria-label="Posizione del brano"
        />
        <div className="mt-3 flex items-center gap-2">
          {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              save(MUSIC_VOLUME_KEY, next);
              if (audioRef.current) audioRef.current.volume = next;
            }}
            className="w-full accent-primary"
            aria-label="Volume"
          />
        </div>
          </>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={toggleLoop}
            aria-pressed={loop}
            className={`press flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-semibold ${loop ? "border-primary bg-primary-soft text-primary" : "border-border"}`}
          >
            <Repeat className="h-3.5 w-3.5" /> Ripeti
          </button>
          <button
            type="button"
            onClick={toggleAutoplay}
            aria-pressed={autoplay}
            className={`press flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-semibold ${autoplay ? "border-primary bg-primary-soft text-primary" : "border-border"}`}
          >
            {autoplay ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} Avvio automatico
          </button>
        </div>
        {localTrack && source !== null && !source.startsWith("blob:") && (
          <button type="button" onClick={useLocalTrack} className="mt-3 w-full text-xs font-semibold text-primary">
            Usa il file locale salvato
          </button>
        )}
        <button
          type="button"
          onClick={() => void clearAll()}
          className="press mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-danger/40 text-xs font-semibold text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" /> Rimuovi musica
        </button>
      </section>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {youtubeId
          ? "Link YouTube Music riconosciuto: usa i controlli del player incorporato."
          : "L’avvio automatico può essere bloccato dal browser finché non premi Play almeno una volta."}
      </p>
    </div>
  );
}
