import { n as load, r as save } from "./storage-D7ptFFhi.js";
import { o as SectionTitle } from "./ui-D03OlNCN.js";
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Check, Link, Music2, Pause, Play, Repeat, Trash2, Upload, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
//#region src/lib/voto/music-storage.ts
var DB_NAME = "voto-music";
var STORE_NAME = "tracks";
var TRACK_KEY = "selected";
function openDatabase() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore(STORE_NAME);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? /* @__PURE__ */ new Error("Impossibile aprire lo storage musicale."));
	});
}
async function saveLocalTrack(file) {
	const db = await openDatabase();
	await new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		transaction.objectStore(STORE_NAME).put(file, TRACK_KEY);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error ?? /* @__PURE__ */ new Error("Impossibile salvare il brano."));
	});
	db.close();
}
async function loadLocalTrack() {
	const db = await openDatabase();
	const value = await new Promise((resolve, reject) => {
		const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(TRACK_KEY);
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () => reject(request.error ?? /* @__PURE__ */ new Error("Impossibile leggere il brano."));
	});
	db.close();
	return value;
}
async function removeLocalTrack() {
	const db = await openDatabase();
	await new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		transaction.objectStore(STORE_NAME).delete(TRACK_KEY);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error ?? /* @__PURE__ */ new Error("Impossibile rimuovere il brano."));
	});
	db.close();
}
var spotifyResourceTypes = /* @__PURE__ */ new Set([
	"album",
	"artist",
	"episode",
	"playlist",
	"show",
	"track"
]);
var spotifyIdPattern = /^[A-Za-z0-9]{22}$/;
function parseSpotifyLink(value) {
	try {
		const url = new URL(value);
		if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") return null;
		const segments = url.pathname.split("/").filter(Boolean);
		if (segments[0]?.startsWith("intl-")) segments.shift();
		if (segments[0] === "embed") segments.shift();
		const type = segments[0];
		const id = segments[1];
		if (!type || !id || !spotifyResourceTypes.has(type) || !spotifyIdPattern.test(id)) return null;
		return {
			type,
			id
		};
	} catch {
		return null;
	}
}
function spotifyEmbedUrl(resource) {
	return `https://open.spotify.com/embed/${resource.type}/${encodeURIComponent(resource.id)}?utm_source=generator&theme=0`;
}
//#endregion
//#region src/components/voto/MusicPanel.tsx
var MUSIC_URL_KEY = "voto.music.url";
var MUSIC_AUTOPLAY_KEY = "voto.music.autoplay";
var MUSIC_LOOP_KEY = "voto.music.loop";
var MUSIC_VOLUME_KEY = "voto.music.volume";
function fileLabel(file) {
	return file instanceof File && file.name ? file.name : "Brano salvato sul dispositivo";
}
function youtubeVideoId(value) {
	try {
		const parsed = new URL(value);
		if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1) || null;
		if (parsed.hostname === "youtube.com" || parsed.hostname === "www.youtube.com" || parsed.hostname === "music.youtube.com") return parsed.searchParams.get("v");
	} catch {
		return null;
	}
	return null;
}
function MusicPanel({ open, onClose }) {
	const audioRef = useRef(null);
	const objectUrlRef = useRef(null);
	const [url, setUrl] = useState(() => load(MUSIC_URL_KEY, ""));
	const [urlInput, setUrlInput] = useState(() => load(MUSIC_URL_KEY, ""));
	const [localTrack, setLocalTrack] = useState(null);
	const [source, setSource] = useState(() => load(MUSIC_URL_KEY, "") || null);
	const [trackName, setTrackName] = useState(() => load(MUSIC_URL_KEY, "") ? "Brano da URL" : "Nessun brano selezionato");
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(() => load(MUSIC_VOLUME_KEY, .8));
	const [loop, setLoop] = useState(() => load(MUSIC_LOOP_KEY, false));
	const [autoplay, setAutoplay] = useState(() => load(MUSIC_AUTOPLAY_KEY, false));
	const [loading, setLoading] = useState(true);
	const youtubeId = source ? youtubeVideoId(source) : null;
	const spotifyResource = source ? parseSpotifyLink(source) : null;
	const youtubeEmbedUrl = youtubeId ? `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?controls=1&rel=0${autoplay ? "&autoplay=1" : ""}${loop ? `&loop=1&playlist=${encodeURIComponent(youtubeId)}` : ""}` : null;
	const spotifyUrl = spotifyResource ? spotifyEmbedUrl(spotifyResource) : null;
	useEffect(() => {
		let cancelled = false;
		loadLocalTrack().then((track) => {
			if (!cancelled && track) {
				setLocalTrack(track);
				if (!url) {
					const nextUrl = URL.createObjectURL(track);
					objectUrlRef.current = nextUrl;
					setSource(nextUrl);
					setTrackName(fileLabel(track));
				}
			}
		}).catch(() => void 0).finally(() => {
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
	}, [
		volume,
		loop,
		source
	]);
	useEffect(() => {
		return () => {
			if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
		};
	}, []);
	const setAudioSource = (nextSource, name, ownsObjectUrl = false) => {
		if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
		objectUrlRef.current = ownsObjectUrl ? nextSource : null;
		setSource(nextSource);
		setTrackName(name);
		setCurrentTime(0);
		setDuration(0);
		setIsPlaying(false);
	};
	const chooseLocalFile = async (file) => {
		if (!file) return;
		if (!file.type.startsWith("audio/")) {
			toast.error("Seleziona un file audio.");
			return;
		}
		try {
			await saveLocalTrack(file);
			setLocalTrack(file);
			const nextUrl = URL.createObjectURL(file);
			setAudioSource(nextUrl, file.name, true);
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
			if (new URL(nextUrl).protocol !== "https:") throw new Error("https");
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
		setAudioSource(nextUrl, fileLabel(localTrack), true);
	};
	const clearAll = async () => {
		await removeLocalTrack().catch(() => void 0);
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
		if (spotifyResource) {
			toast("Usa i controlli del player Spotify per avviare o mettere in pausa.");
			return;
		}
		const audio = audioRef.current;
		if (!audio || !source) {
			toast("Scegli prima un file o un URL audio.");
			return;
		}
		if (audio.paused) try {
			await audio.play();
		} catch {
			toast.error("Il browser non ha avviato la riproduzione.");
		}
		else audio.pause();
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
	return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("div", {
		className: open ? "fixed inset-0 z-50 overflow-y-auto bg-background px-5 pb-8 pt-5" : "pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0",
		children: /* @__PURE__ */ jsxs("div", {
			className: "pt-3",
			children: [
				/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: onClose,
					className: "mb-5 text-sm font-semibold text-primary",
					children: "← Torna a Personalizza"
				}),
				/* @__PURE__ */ jsx("h1", {
					className: "font-display text-2xl font-semibold",
					children: "Musica"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Scegli un file dal dispositivo, incolla un URL audio diretto o un link Spotify/YouTube."
				}),
				/* @__PURE__ */ jsx(SectionTitle, { children: "Brano dal dispositivo" }),
				/* @__PURE__ */ jsxs("section", {
					className: "card-surface p-4",
					children: [/* @__PURE__ */ jsxs("label", {
						className: "press flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary-soft p-4 text-sm font-semibold",
						children: [
							/* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }),
							"Scegli file audio",
							/* @__PURE__ */ jsx("input", {
								type: "file",
								accept: "audio/*",
								className: "sr-only",
								onChange: (event) => void chooseLocalFile(event.target.files?.[0])
							})
						]
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-2 truncate text-[11px] text-muted-foreground",
						children: localTrack ? fileLabel(localTrack) : "Il file resta salvato solo su questo dispositivo."
					})]
				}),
				/* @__PURE__ */ jsx(SectionTitle, { children: "Brano da URL" }),
				/* @__PURE__ */ jsxs("section", {
					className: "card-surface p-4",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ jsx("input", {
							value: urlInput,
							onChange: (event) => setUrlInput(event.target.value),
							placeholder: "Link Spotify/YouTube o URL audio .mp3",
							type: "url",
							className: "h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-xs",
							"aria-label": "URL del brano audio"
						}), /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: useUrl,
							className: "press flex h-10 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground",
							children: [/* @__PURE__ */ jsx(Link, { className: "h-3.5 w-3.5" }), " Usa"]
						})]
					}), url && /* @__PURE__ */ jsxs("p", {
						className: "mt-2 truncate text-[11px] text-muted-foreground",
						children: ["URL salvato: ", url]
					})]
				}),
				/* @__PURE__ */ jsx(SectionTitle, { children: "Lettore" }),
				/* @__PURE__ */ jsxs("section", {
					className: "card-surface p-4",
					children: [
						spotifyUrl && spotifyResource && /* @__PURE__ */ jsx("div", {
							className: "overflow-hidden rounded-xl bg-black",
							children: /* @__PURE__ */ jsx("iframe", {
								src: spotifyUrl,
								title: "Player Spotify",
								className: "w-full border-0",
								style: { height: spotifyResource.type === "track" || spotifyResource.type === "episode" ? 152 : 352 },
								allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
								loading: "lazy"
							})
						}),
						youtubeEmbedUrl && /* @__PURE__ */ jsx("div", {
							className: "overflow-hidden rounded-xl bg-black",
							children: /* @__PURE__ */ jsx("iframe", {
								src: youtubeEmbedUrl,
								title: "Player YouTube Music",
								className: "aspect-video w-full",
								allow: "autoplay; encrypted-media; picture-in-picture",
								allowFullScreen: true
							})
						}),
						/* @__PURE__ */ jsx("audio", {
							ref: audioRef,
							src: youtubeId || spotifyResource ? void 0 : source ?? void 0,
							preload: "metadata",
							onLoadedMetadata: (event) => {
								setDuration(event.currentTarget.duration || 0);
								event.currentTarget.volume = volume;
								event.currentTarget.loop = loop;
								if (autoplay) event.currentTarget.play().catch(() => void 0);
							},
							onTimeUpdate: (event) => setCurrentTime(event.currentTarget.currentTime),
							onPlay: () => setIsPlaying(true),
							onPause: () => setIsPlaying(false),
							onEnded: () => setIsPlaying(false),
							className: "hidden"
						}),
						!youtubeId && !spotifyResource && /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-3",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
										children: /* @__PURE__ */ jsx(Music2, { className: "h-5 w-5" })
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ jsx("p", {
											className: "truncate text-sm font-semibold",
											children: loading ? "Caricamento…" : trackName
										}), /* @__PURE__ */ jsx("p", {
											className: "text-[11px] text-muted-foreground",
											children: duration ? `${Math.floor(currentTime)} / ${Math.floor(duration)} secondi` : "Pronto"
										})]
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: togglePlayback,
										"aria-label": isPlaying ? "Metti in pausa" : "Riproduci",
										className: "press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
										children: isPlaying ? /* @__PURE__ */ jsx(Pause, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(Play, { className: "ml-0.5 h-5 w-5" })
									})
								]
							}),
							/* @__PURE__ */ jsx("input", {
								type: "range",
								min: "0",
								max: duration || 1,
								step: "0.1",
								value: Math.min(currentTime, duration || 1),
								onChange: (event) => {
									const next = Number(event.target.value);
									if (audioRef.current) audioRef.current.currentTime = next;
									setCurrentTime(next);
								},
								className: "mt-4 w-full accent-primary",
								"aria-label": "Posizione del brano"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-3 flex items-center gap-2",
								children: [volume === 0 ? /* @__PURE__ */ jsx(VolumeX, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Volume2, { className: "h-4 w-4" }), /* @__PURE__ */ jsx("input", {
									type: "range",
									min: "0",
									max: "1",
									step: "0.05",
									value: volume,
									onChange: (event) => {
										const next = Number(event.target.value);
										setVolume(next);
										save(MUSIC_VOLUME_KEY, next);
										if (audioRef.current) audioRef.current.volume = next;
									},
									className: "w-full accent-primary",
									"aria-label": "Volume"
								})]
							})
						] }),
						!spotifyResource && /* @__PURE__ */ jsxs("div", {
							className: "mt-4 grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ jsxs("button", {
								type: "button",
								onClick: toggleLoop,
								"aria-pressed": loop,
								className: `press flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-semibold ${loop ? "border-primary bg-primary-soft text-primary" : "border-border"}`,
								children: [/* @__PURE__ */ jsx(Repeat, { className: "h-3.5 w-3.5" }), " Ripeti"]
							}), /* @__PURE__ */ jsxs("button", {
								type: "button",
								onClick: toggleAutoplay,
								"aria-pressed": autoplay,
								className: `press flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-semibold ${autoplay ? "border-primary bg-primary-soft text-primary" : "border-border"}`,
								children: [
									autoplay ? /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx(Play, { className: "h-3.5 w-3.5" }),
									" ",
									"Avvio automatico"
								]
							})]
						}),
						localTrack && source !== null && !source.startsWith("blob:") && /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: useLocalTrack,
							className: "mt-3 w-full text-xs font-semibold text-primary",
							children: "Usa il file locale salvato"
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => void clearAll(),
							className: "press mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-danger/40 text-xs font-semibold text-danger",
							children: [/* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }), " Rimuovi musica"]
						})
					]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-3 text-[11px] text-muted-foreground",
					children: spotifyResource ? "Link Spotify riconosciuto: usa i controlli del player incorporato." : youtubeId ? "Link YouTube Music riconosciuto: usa i controlli del player incorporato." : "L’avvio automatico può essere bloccato dal browser finché non premi Play almeno una volta."
				})
			]
		})
	}) });
}
//#endregion
export { MusicPanel };
