import { a as SheetTitle, i as SheetHeader, n as SheetContent, r as SheetDescription, t as Sheet } from "./sheet-D410YndM.js";
import { a as extractCircularPdfText, c as renderCircularPdfPageImages, i as extractCircularDocxText, n as analyzeCircularPdf, t as analyzeCircularDocx } from "./circular-reader-Bi5AGq_T.js";
import { n as askAboutCircular, r as askAboutCircularImages, s as answerCircularQuestionLocally, t as AssistantMarkdown } from "./AssistantMarkdown-DWLsUTye.js";
import { t as useOnlineStatus } from "./use-online-status-B-_W9iFn.js";
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CalendarDays, Download, ExternalLink, FileText, LoaderCircle, Minus, Paperclip, Plus, ShieldCheck, Sparkles, Users, X, ZoomIn } from "lucide-react";
//#region src/lib/voto/zoom-pan.ts
function isInteractiveTarget(target) {
	return target instanceof Element && Boolean(target.closest("button, a, input, textarea, select"));
}
function beginZoomPan(event, zoom, stateRef) {
	if (zoom <= 1 || event.pointerType === "touch" || isInteractiveTarget(event.target)) return;
	stateRef.current = {
		pointerId: event.pointerId,
		startX: event.clientX,
		startY: event.clientY,
		scrollLeft: event.currentTarget.scrollLeft,
		scrollTop: event.currentTarget.scrollTop
	};
	if (Number.isFinite(event.pointerId)) event.currentTarget.setPointerCapture?.(event.pointerId);
}
function moveZoomPan(event, stateRef) {
	const state = stateRef.current;
	if (event.pointerType === "touch" || !state || state.pointerId !== event.pointerId) return;
	event.preventDefault();
	event.currentTarget.scrollLeft = state.scrollLeft - (event.clientX - state.startX);
	event.currentTarget.scrollTop = state.scrollTop - (event.clientY - state.startY);
}
function endZoomPan(event, stateRef) {
	if (stateRef.current?.pointerId === event.pointerId) stateRef.current = null;
}
//#endregion
//#region src/lib/voto/pdf-render-profile.ts
var DEFAULT_PAGE_SCALE = 1.25;
var DEFAULT_ROOT_MARGIN = "900px 0px";
var PERFORMANCE_PAGE_SCALE = 1;
var PERFORMANCE_PIXEL_RATIO = 1.25;
var PERFORMANCE_ROOT_MARGIN = "300px 0px";
function getPdfRenderProfile({ performanceMode, smallScreen, devicePixelRatio }) {
	const pixelRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
	if (!performanceMode || !smallScreen) return {
		pageScale: DEFAULT_PAGE_SCALE,
		renderRatio: pixelRatio,
		rootMargin: DEFAULT_ROOT_MARGIN
	};
	return {
		pageScale: PERFORMANCE_PAGE_SCALE,
		renderRatio: Math.min(pixelRatio, PERFORMANCE_PIXEL_RATIO),
		rootMargin: PERFORMANCE_ROOT_MARGIN
	};
}
//#endregion
//#region src/components/voto/PdfCanvasPreview.tsx
function makePageSlot(title, pageNumber, aspectRatio) {
	const slot = document.createElement("div");
	slot.dataset["pdfPage"] = String(pageNumber);
	slot.setAttribute("role", "group");
	slot.setAttribute("aria-label", `${title}, pagina ${pageNumber}`);
	slot.className = "flex w-full items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm";
	slot.style.aspectRatio = aspectRatio;
	const label = document.createElement("span");
	label.className = "text-xs text-neutral-500";
	label.textContent = `Pagina ${pageNumber}`;
	slot.appendChild(label);
	return slot;
}
function PdfCanvasPreview({ src, title, zoom = 1, onError }) {
	const containerRef = useRef(null);
	const panStateRef = useRef(null);
	const horizontalScrollRatioRef = useRef(.5);
	const [status, setStatus] = useState("loading");
	const [pageCount, setPageCount] = useState(0);
	useEffect(() => {
		let cancelled = false;
		let firstPageRendered = false;
		let disposeLoadingTask;
		let cancelCurrentRender;
		let observer;
		const container = containerRef.current;
		if (!container) return;
		const scrollport = container.parentElement;
		if (zoom <= 1) horizontalScrollRatioRef.current = .5;
		container.replaceChildren();
		setStatus("loading");
		setPageCount(0);
		(async () => {
			try {
				const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
				if (cancelled) return;
				pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
				const loadingTask = pdfjs.getDocument({
					url: src,
					withCredentials: true,
					disableStream: true,
					disableAutoFetch: true
				});
				disposeLoadingTask = () => loadingTask.destroy();
				const pdf = await loadingTask.promise;
				if (cancelled) {
					await loadingTask.destroy();
					return;
				}
				if (pdf.numPages < 1) throw new Error("pdf_has_no_pages");
				setPageCount(pdf.numPages);
				const renderProfile = getPdfRenderProfile({
					performanceMode: document.documentElement.dataset["performance"] === "on",
					smallScreen: typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches,
					devicePixelRatio: window.devicePixelRatio || 1
				});
				const firstPage = await pdf.getPage(1);
				if (cancelled) return;
				const pageScale = renderProfile.pageScale * zoom;
				const firstViewport = firstPage.getViewport({ scale: pageScale });
				const aspectRatio = `${firstViewport.width} / ${firstViewport.height}`;
				const slots = Array.from({ length: pdf.numPages }, (_, index) => makePageSlot(title, index + 1, aspectRatio));
				slots.forEach((slot) => container.appendChild(slot));
				const renderPage = async (pageNumber, knownPage) => {
					const page = knownPage ?? await pdf.getPage(pageNumber);
					if (cancelled) return;
					const viewport = page.getViewport({ scale: pageScale });
					const slot = slots[pageNumber - 1];
					if (!slot) throw new Error("pdf_page_slot_missing");
					slot.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
					const basePageWidth = viewport.width / zoom;
					slot.style.width = zoom === 1 ? "100%" : `${basePageWidth * zoom}px`;
					const canvas = document.createElement("canvas");
					canvas.setAttribute("aria-label", `${title}, pagina ${pageNumber}`);
					canvas.className = "block h-auto w-full rounded-lg bg-white shadow-sm";
					canvas.width = Math.ceil(viewport.width * renderProfile.renderRatio);
					canvas.height = Math.ceil(viewport.height * renderProfile.renderRatio);
					canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
					const context = canvas.getContext("2d");
					if (!context) throw new Error("canvas_context_unavailable");
					context.setTransform(renderProfile.renderRatio, 0, 0, renderProfile.renderRatio, 0, 0);
					const task = page.render({
						canvas: null,
						canvasContext: context,
						viewport
					});
					const cancelTask = () => task.cancel();
					cancelCurrentRender = cancelTask;
					try {
						await task.promise;
					} finally {
						if (cancelCurrentRender === cancelTask) cancelCurrentRender = void 0;
					}
					if (!cancelled) slot.replaceChildren(canvas);
				};
				const showPageError = (pageNumber) => {
					if (cancelled) return;
					const slot = slots[pageNumber - 1];
					if (!slot) return;
					const message = document.createElement("span");
					message.className = "px-3 text-center text-xs text-neutral-600";
					message.textContent = `Anteprima della pagina ${pageNumber} non disponibile`;
					slot.replaceChildren(message);
				};
				await renderPage(1, firstPage);
				if (cancelled) return;
				firstPageRendered = true;
				if (scrollport && zoom > 1) {
					const maxScrollLeft = Math.max(0, scrollport.scrollWidth - scrollport.clientWidth);
					scrollport.scrollLeft = Math.round(maxScrollLeft * horizontalScrollRatioRef.current);
				}
				setStatus("ready");
				await new Promise((resolve) => {
					if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(() => resolve());
					else window.setTimeout(resolve, 0);
				});
				if (cancelled || pdf.numPages === 1) return;
				if (typeof IntersectionObserver === "function") {
					const pageQueue = [];
					const queuedPages = /* @__PURE__ */ new Set([1]);
					let processingQueue = false;
					const distanceFromViewport = (pageNumber) => {
						const slot = slots[pageNumber - 1];
						const scrollport = container.parentElement;
						if (!slot || !scrollport) return Number.MAX_SAFE_INTEGER;
						const pageRect = slot.getBoundingClientRect();
						const scrollRect = scrollport.getBoundingClientRect();
						if (pageRect.bottom < scrollRect.top) return scrollRect.top - pageRect.bottom;
						if (pageRect.top > scrollRect.bottom) return pageRect.top - scrollRect.bottom;
						return 0;
					};
					const renderQueuedPages = async () => {
						if (processingQueue) return;
						processingQueue = true;
						try {
							while (pageQueue.length > 0 && !cancelled) {
								pageQueue.sort((left, right) => distanceFromViewport(left) - distanceFromViewport(right) || left - right);
								const pageNumber = pageQueue.shift();
								if (pageNumber === void 0) continue;
								try {
									await renderPage(pageNumber);
								} catch {
									showPageError(pageNumber);
								}
							}
						} finally {
							processingQueue = false;
						}
					};
					observer = new IntersectionObserver((entries) => {
						for (const entry of entries) {
							if (!entry.isIntersecting) continue;
							const pageNumber = Number(entry.target.dataset["pdfPage"]);
							if (!Number.isInteger(pageNumber) || pageNumber < 2 || queuedPages.has(pageNumber)) continue;
							queuedPages.add(pageNumber);
							observer?.unobserve(entry.target);
							pageQueue.push(pageNumber);
						}
						renderQueuedPages();
					}, {
						root: container.parentElement,
						rootMargin: renderProfile.rootMargin
					});
					slots.slice(1).forEach((slot) => observer?.observe(slot));
				} else for (let pageNumber = 2; pageNumber <= pdf.numPages && !cancelled; pageNumber += 1) try {
					await renderPage(pageNumber);
				} catch {
					showPageError(pageNumber);
				}
			} catch {
				if (!cancelled && !firstPageRendered) {
					setStatus("error");
					onError?.();
				}
			}
		})();
		return () => {
			cancelled = true;
			observer?.disconnect();
			cancelCurrentRender?.();
			container.replaceChildren();
			if (disposeLoadingTask) disposeLoadingTask().catch(() => {});
		};
	}, [
		src,
		title,
		zoom,
		onError
	]);
	return /* @__PURE__ */ jsxs("div", {
		role: "document",
		"aria-label": title,
		"aria-busy": status === "loading",
		className: `min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-black/20 p-2 ${zoom > 1 ? "touch-pan-x touch-pan-y cursor-grab select-none overflow-x-auto active:cursor-grabbing" : "touch-pan-y overflow-x-hidden"}`,
		onPointerDown: (event) => beginZoomPan(event, zoom, panStateRef),
		onPointerMove: (event) => moveZoomPan(event, panStateRef),
		onPointerUp: (event) => endZoomPan(event, panStateRef),
		onPointerCancel: (event) => endZoomPan(event, panStateRef),
		onScroll: (event) => {
			const { scrollLeft, scrollWidth, clientWidth } = event.currentTarget;
			const maxScrollLeft = scrollWidth - clientWidth;
			if (maxScrollLeft > 0) horizontalScrollRatioRef.current = Math.min(1, Math.max(0, scrollLeft / maxScrollLeft));
		},
		children: [
			status === "loading" && /* @__PURE__ */ jsx("p", {
				className: "p-8 text-center text-sm text-muted-foreground",
				children: "Caricamento PDF…"
			}),
			status === "error" && /* @__PURE__ */ jsx("p", {
				className: "p-8 text-center text-sm text-muted-foreground",
				children: "Anteprima non disponibile. Usa Apri PDF o Scarica PDF."
			}),
			/* @__PURE__ */ jsx("div", {
				ref: containerRef,
				className: "space-y-3",
				"aria-hidden": status !== "ready"
			}),
			status === "ready" && pageCount > 0 && /* @__PURE__ */ jsxs("span", {
				className: "sr-only",
				children: [pageCount, " pagine"]
			})
		]
	});
}
//#endregion
//#region src/components/voto/CircularViewer.tsx
var MAX_AI_DOCUMENT_LENGTH = 6e4;
var AI_MODE_STORAGE_KEY = "voto.circular-assistant-mode.v1";
function safeAttachmentFilename(value) {
	return Array.from(value?.trim() || "allegato", (char) => {
		const code = char.charCodeAt(0);
		return char === "\\" || char === "/" || char === "\"" || code < 32 || code === 127 ? "_" : char;
	}).join("").replace(/\s+/g, " ").slice(0, 120) || "allegato";
}
function internalPdfUrl(path, download = false, filename) {
	const params = new URLSearchParams({ path });
	if (download) {
		params.set("download", "1");
		params.set("filename", filename ?? "circolare.pdf");
	}
	return `/api/circulars/mirror?${params.toString()}`;
}
function mergeAttachments(attachments, fallback) {
	const merged = [];
	for (const file of [...attachments ?? [], fallback]) {
		if (!file.name && !file.path && !file.url) continue;
		const name = file.name?.trim().toLocaleLowerCase("it-IT");
		const existingIndex = name ? merged.findIndex((item) => item.name?.trim().toLocaleLowerCase("it-IT") === name) : -1;
		if (existingIndex >= 0) {
			const existing = merged[existingIndex];
			if (!existing) continue;
			merged[existingIndex] = {
				...file,
				...existing,
				...existing.path || !file.path ? {} : { path: file.path },
				...existing.url || !file.url ? {} : { url: file.url }
			};
			continue;
		}
		merged.push(file);
	}
	return merged;
}
function DocxPreview({ src, title, initialText, zoom }) {
	const previewRef = useRef(null);
	const panStateRef = useRef(null);
	const horizontalScrollRatioRef = useRef(.5);
	const bodyRef = useRef(null);
	const styleRef = useRef(null);
	const fallbackText = initialText?.trim() ?? "";
	const [status, setStatus] = useState(fallbackText ? "text" : "loading");
	useEffect(() => {
		let cancelled = false;
		setStatus(fallbackText ? "text" : "loading");
		if (bodyRef.current) bodyRef.current.replaceChildren();
		if (styleRef.current) styleRef.current.replaceChildren();
		fetch(src, { credentials: "same-origin" }).then((response) => {
			if (!response.ok) throw new Error(`docx_download_${response.status}`);
			return response.blob();
		}).then(async (blob) => {
			const { renderAsync } = await import("docx-preview");
			if (!bodyRef.current || cancelled) return;
			await renderAsync(blob, bodyRef.current, styleRef.current ?? void 0, {
				breakPages: true,
				ignoreWidth: true,
				ignoreHeight: true,
				renderHeaders: true,
				renderFooters: true,
				useBase64URL: true
			});
			if (cancelled) return;
			setStatus("rendered");
		}).catch(() => {
			if (!cancelled) setStatus(fallbackText ? "text" : "error");
		});
		return () => {
			cancelled = true;
		};
	}, [fallbackText, src]);
	useEffect(() => {
		const preview = previewRef.current;
		if (!preview) return;
		if (zoom <= 1) {
			horizontalScrollRatioRef.current = .5;
			return;
		}
		const frame = window.requestAnimationFrame(() => {
			const maxScrollLeft = Math.max(0, preview.scrollWidth - preview.clientWidth);
			preview.scrollLeft = Math.round(maxScrollLeft * horizontalScrollRatioRef.current);
		});
		return () => window.cancelAnimationFrame(frame);
	}, [status, zoom]);
	return /* @__PURE__ */ jsx("div", {
		className: "flex h-full min-h-0 flex-1 flex-col gap-2",
		children: /* @__PURE__ */ jsxs("div", {
			role: "document",
			"aria-label": title,
			"aria-busy": status === "loading",
			ref: previewRef,
			className: `min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-black/10 p-2 ${zoom > 1 ? "touch-pan-x touch-pan-y cursor-grab select-none overflow-x-auto active:cursor-grabbing" : "touch-pan-y overflow-x-hidden"}`,
			style: { "--docx-zoom": zoom },
			onPointerDown: (event) => beginZoomPan(event, zoom, panStateRef),
			onPointerMove: (event) => moveZoomPan(event, panStateRef),
			onPointerUp: (event) => endZoomPan(event, panStateRef),
			onPointerCancel: (event) => endZoomPan(event, panStateRef),
			onScroll: (event) => {
				const { scrollLeft, scrollWidth, clientWidth } = event.currentTarget;
				const maxScrollLeft = scrollWidth - clientWidth;
				if (maxScrollLeft > 0) horizontalScrollRatioRef.current = Math.min(1, Math.max(0, scrollLeft / maxScrollLeft));
			},
			children: [
				status === "loading" && /* @__PURE__ */ jsx("p", {
					className: "p-8 text-center text-sm text-muted-foreground",
					children: "Caricamento anteprima DOCX…"
				}),
				status === "error" && /* @__PURE__ */ jsx("p", {
					className: "p-8 text-center text-sm leading-relaxed text-muted-foreground",
					children: "Anteprima non disponibile. Usa il pulsante sotto per aprire o scaricare il DOCX."
				}),
				status === "text" && /* @__PURE__ */ jsxs("div", {
					className: "rounded-lg bg-card p-4",
					children: [/* @__PURE__ */ jsx("p", {
						className: "mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
						children: "Testo estratto"
					}), /* @__PURE__ */ jsx("p", {
						className: "whitespace-pre-wrap text-sm leading-relaxed text-foreground",
						children: fallbackText
					})]
				}),
				/* @__PURE__ */ jsx("style", { ref: styleRef }),
				/* @__PURE__ */ jsx("div", {
					ref: bodyRef,
					className: status === "rendered" ? "docx-preview-body" : "hidden"
				}),
				/* @__PURE__ */ jsx("style", { children: `
        .docx-preview-body,
        .docx-preview-body .docx-wrapper {
          min-height: 100% !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }
        .docx-preview-body .docx-wrapper {
          height: max-content !important;
        }
        .docx-preview-body section.docx {
          box-sizing: border-box !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: auto !important;
          margin: 0 0 0.75rem !important;
          padding: 1rem !important;
          overflow: visible !important;
          box-shadow: 0 1px 3px rgb(0 0 0 / 12%) !important;
          zoom: var(--docx-zoom, 1);
        }
        .docx-preview-body section.docx:last-child {
          margin-bottom: 0 !important;
        }
        .docx-preview-body table,
        .docx-preview-body img {
          max-width: 100% !important;
        }
        .docx-preview-body table {
          table-layout: auto !important;
        }
        .docx-preview-body span,
        .docx-preview-body p,
        .docx-preview-body td,
        .docx-preview-body th {
          overflow-wrap: normal !important;
          word-break: normal !important;
          hyphens: none !important;
        }
      ` })
			]
		})
	});
}
function CircularViewer({ open, onOpenChange, title, fileName, url, path, attachments, extractedText }) {
	const files = mergeAttachments(attachments, {
		name: fileName,
		path,
		url
	});
	const isOnline = useOnlineStatus();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isZoomControlsOpen, setIsZoomControlsOpen] = useState(false);
	const [attachmentZoom, setAttachmentZoom] = useState(1);
	const [isDownloading, setIsDownloading] = useState(false);
	const [downloadError, setDownloadError] = useState();
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysis, setAnalysis] = useState(null);
	const [analysisError, setAnalysisError] = useState();
	const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
	const [aiQuestion, setAiQuestion] = useState("");
	const [aiMode, setAiMode] = useState("local");
	const [isAiChatOpen, setIsAiChatOpen] = useState(false);
	const [aiMessages, setAiMessages] = useState([]);
	const [aiError, setAiError] = useState();
	const [isAskingAi, setIsAskingAi] = useState(false);
	const [aiProgressMessage, setAiProgressMessage] = useState();
	const [aiDocumentTruncated, setAiDocumentTruncated] = useState(false);
	const activeAiMode = isOnline && (aiMode === "api" || aiMode === "api-vision") ? aiMode : "local";
	const aiRequestId = useRef(0);
	useEffect(() => {
		try {
			const savedMode = window.localStorage.getItem(AI_MODE_STORAGE_KEY);
			if (!navigator.onLine || savedMode === "device" || savedMode === "vision") {
				setAiMode("local");
				window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
			} else if (savedMode === "local" || savedMode === "api" || savedMode === "api-vision") setAiMode(savedMode);
			window.localStorage.removeItem("voto.circular-ai-models.v1");
		} catch {}
	}, []);
	useEffect(() => {
		if (isOnline && (typeof navigator === "undefined" || navigator.onLine) || aiMode === "local") return;
		setAiMode("local");
		try {
			window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
		} catch {}
	}, [aiMode, isOnline]);
	useEffect(() => {
		if (open) {
			setSelectedIndex(0);
			setIsZoomControlsOpen(false);
			setAttachmentZoom(1);
			setAnalysis(null);
			setAnalysisError(void 0);
			setIsAnalysisOpen(false);
			setIsAiChatOpen(false);
			setAiQuestion("");
			setAiMessages([]);
			setAiError(void 0);
			setAiProgressMessage(void 0);
			setAiDocumentTruncated(false);
			setIsAskingAi(false);
			aiRequestId.current += 1;
		}
	}, [open, title]);
	const activeIndex = Math.min(selectedIndex, Math.max(0, files.length - 1));
	const activeFile = files[activeIndex];
	useEffect(() => {
		setIsZoomControlsOpen(false);
		setAnalysis(null);
		setAnalysisError(void 0);
		setIsAnalysisOpen(false);
		setIsAiChatOpen(false);
		setAiQuestion("");
		setAiMessages([]);
		setAiError(void 0);
		setAiProgressMessage(void 0);
		setIsAskingAi(false);
		setAiDocumentTruncated(false);
		aiRequestId.current += 1;
	}, [
		activeFile?.path,
		activeFile?.url,
		activeFile?.name
	]);
	const attachmentFilename = safeAttachmentFilename(activeFile?.name);
	const previewUrl = (activeFile?.path ? internalPdfUrl(activeFile.path) : void 0) ?? activeFile?.url;
	const downloadUrl = activeFile?.path ? internalPdfUrl(activeFile.path, true, attachmentFilename) : activeFile?.url;
	const isPdf = /\.pdf$/i.test(activeFile?.name ?? "") || /\.pdf$/i.test(activeFile?.path ?? "");
	const isDocx = /\.docx$/i.test(activeFile?.name ?? "") || /\.docx$/i.test(activeFile?.path ?? "");
	const hasTextOnlyContent = !previewUrl && Boolean(extractedText?.trim());
	const documentLabel = hasTextOnlyContent ? "comunicazione" : "circolare";
	const canAnalyze = Boolean(previewUrl && (isPdf || isDocx));
	const canAskAi = canAnalyze || hasTextOnlyContent;
	const effectiveAiMode = !isPdf && activeAiMode === "api-vision" ? "local" : activeAiMode;
	const availableAiModeCount = 1 + Number(isOnline) + Number(isPdf && isOnline);
	const aiModeGridClass = availableAiModeCount <= 1 ? "grid-cols-1" : availableAiModeCount === 2 ? "grid-cols-2" : "grid-cols-3";
	function chooseAiMode(mode) {
		if ((mode === "api" || mode === "api-vision") && (!isOnline || !navigator.onLine)) return;
		if (mode === aiMode) return;
		setAiMode(mode);
		setAiQuestion("");
		setAiMessages([]);
		setAiError(void 0);
		setAiProgressMessage(void 0);
		try {
			window.localStorage.setItem(AI_MODE_STORAGE_KEY, mode);
		} catch {}
	}
	async function analyzeDocument() {
		if (!previewUrl || isAnalyzing) return;
		setIsAnalyzing(true);
		setAnalysisError(void 0);
		setAnalysis(null);
		try {
			const linkedAttachments = files.map((file) => file.name ?? "").filter(Boolean);
			const result = isPdf ? await analyzeCircularPdf(previewUrl, linkedAttachments) : await analyzeCircularDocx(previewUrl, linkedAttachments);
			setAnalysis(result);
			setIsAnalysisOpen(true);
		} catch {
			setAnalysisError(`Non sono riuscito a leggere questo ${isPdf ? "PDF" : "DOCX"}. Verifica la connessione o scarica il documento e riprova.`);
			setIsAnalysisOpen(true);
		} finally {
			setIsAnalyzing(false);
		}
	}
	async function askAiAboutDocument(event) {
		event.preventDefault();
		const question = aiQuestion.trim();
		if (!previewUrl && !extractedText?.trim() || !question || isAskingAi) return;
		const browserOnline = isOnline && (typeof navigator === "undefined" || navigator.onLine);
		const responseMode = effectiveAiMode;
		const requestId = aiRequestId.current + 1;
		aiRequestId.current = requestId;
		setAiQuestion("");
		setAiError(void 0);
		setAiMessages((current) => [...current, {
			role: "user",
			text: question
		}]);
		setIsAskingAi(true);
		setAiProgressMessage(responseMode === "api-vision" ? "Preparo le immagini delle pagine…" : void 0);
		try {
			let answer;
			if (responseMode === "api-vision") {
				if (!isPdf || !previewUrl) throw new Error("L’API visiva è disponibile solo per i PDF.");
				const visualInput = await renderCircularPdfPageImages(previewUrl);
				const pagesForApi = visualInput.pages.slice(0, 3);
				setAiDocumentTruncated(visualInput.truncated || visualInput.pages.length > 3);
				setAiProgressMessage("Invio le immagini a Groq per l’analisi visiva…");
				answer = await askAboutCircularImages({
					question,
					pageImages: pagesForApi
				});
			} else {
				const availableText = extractedText?.trim();
				const extractedDocument = availableText ? {
					text: availableText,
					truncated: false
				} : previewUrl ? isPdf ? await extractCircularPdfText(previewUrl) : await extractCircularDocxText(previewUrl) : {
					text: "",
					truncated: false
				};
				const documentText = extractedDocument.text.trim();
				if (!documentText) throw new Error("Non trovo testo selezionabile nella circolare. Per analizzare una scansione, usa API visiva.");
				const documentTruncated = extractedDocument.truncated || documentText.length > MAX_AI_DOCUMENT_LENGTH;
				setAiDocumentTruncated(documentTruncated);
				const limitedDocumentText = documentText.slice(0, MAX_AI_DOCUMENT_LENGTH);
				if (responseMode === "api" && browserOnline) answer = await askAboutCircular({
					question,
					documentText: limitedDocumentText,
					documentTruncated
				});
				else answer = answerCircularQuestionLocally(question, limitedDocumentText);
			}
			if (aiRequestId.current === requestId) setAiMessages((current) => [...current, {
				role: "assistant",
				text: answer
			}]);
		} catch (error) {
			if (aiRequestId.current === requestId) setAiError(error instanceof Error ? error.message : "Domanda non riuscita. Riprova.");
		} finally {
			if (aiRequestId.current === requestId) {
				setIsAskingAi(false);
				setAiProgressMessage(void 0);
			}
		}
	}
	async function downloadAttachment() {
		if (!downloadUrl || isDownloading) return;
		if (!activeFile?.path) {
			window.open(downloadUrl, "_blank", "noopener,noreferrer");
			return;
		}
		setIsDownloading(true);
		setDownloadError(void 0);
		try {
			const response = await fetch(downloadUrl, { credentials: "same-origin" });
			if (!response.ok) throw new Error(`download_${response.status}`);
			const blob = await response.blob();
			const objectUrl = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = objectUrl;
			link.download = attachmentFilename;
			link.rel = "noopener";
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
		} catch {
			setDownloadError("Download non riuscito. Riprova tra qualche secondo.");
		} finally {
			setIsDownloading(false);
		}
	}
	function openAttachment() {
		if (!previewUrl) return;
		window.open(previewUrl, "_blank", "noopener,noreferrer");
	}
	return /* @__PURE__ */ jsx(Sheet, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ jsxs(SheetContent, {
			side: "bottom",
			className: "mx-auto flex h-[92dvh] w-full max-w-[720px] flex-col rounded-t-3xl border-border bg-popover px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "mx-auto mb-3 h-1 w-10 rounded-full bg-muted",
					"aria-hidden": true
				}),
				/* @__PURE__ */ jsxs(SheetHeader, {
					className: "mb-3 pr-8 text-left",
					children: [/* @__PURE__ */ jsxs(SheetTitle, {
						className: "flex items-center gap-2 font-display text-base tracking-tight",
						children: [/* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 shrink-0 text-primary" }), /* @__PURE__ */ jsx("span", {
							className: "truncate",
							children: title
						})]
					}), /* @__PURE__ */ jsx(SheetDescription, {
						className: "truncate",
						children: activeFile?.name ?? (hasTextOnlyContent ? "Comunicazione testuale" : "Circolare")
					})]
				}),
				canAskAi && /* @__PURE__ */ jsxs("div", {
					className: "mb-3 shrink-0 space-y-2",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: isPdf || isDocx ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2" : canAnalyze ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2",
							children: [
								canAnalyze && /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => {
										if (analysis || analysisError) setIsAnalysisOpen((openNow) => !openNow);
										else analyzeDocument();
									},
									disabled: isAnalyzing,
									className: "press inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-[11px] font-semibold text-primary disabled:opacity-60",
									children: [isAnalyzing ? /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4" }), isAnalyzing ? "Lettura in corso…" : analysis || analysisError ? isAnalysisOpen ? "Nascondi analisi" : "Mostra analisi" : "Riassumi sul dispositivo"]
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									"aria-expanded": isAiChatOpen,
									"aria-controls": "circular-ai-chat",
									onClick: () => setIsAiChatOpen((openNow) => !openNow),
									className: "press inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-[11px] font-semibold text-foreground",
									children: isAiChatOpen ? "Nascondi chat" : "Fai una domanda"
								}),
								(isPdf || isDocx) && previewUrl && /* @__PURE__ */ jsx("button", {
									type: "button",
									"aria-expanded": isZoomControlsOpen,
									"aria-label": isZoomControlsOpen ? "Nascondi controlli zoom allegato" : "Mostra controlli zoom allegato",
									onClick: () => setIsZoomControlsOpen((openNow) => !openNow),
									className: "press inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-primary",
									children: /* @__PURE__ */ jsx(ZoomIn, { className: "h-4 w-4" })
								})
							]
						}),
						(isPdf || isDocx) && isZoomControlsOpen && /* @__PURE__ */ jsxs("div", {
							className: "flex shrink-0 items-center justify-between rounded-xl border border-border bg-card px-2 py-1.5",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-[11px] font-medium text-muted-foreground",
								children: "Zoom preview"
							}), /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-1",
								children: [
									/* @__PURE__ */ jsxs("button", {
										type: "button",
										"aria-label": "Reimposta zoom allegato",
										onClick: () => setAttachmentZoom(1),
										className: "press min-w-[48px] rounded-lg px-1.5 py-1 text-[10px] font-semibold text-primary",
										children: [Math.round(attachmentZoom * 100), "%"]
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-label": "Aumenta zoom allegato",
										onClick: () => setAttachmentZoom((current) => Math.min(2.5, Math.round((current + .1) * 10) / 10)),
										className: "press inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-foreground",
										children: /* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" })
									}),
									attachmentZoom > 1 && /* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-label": "Riduci zoom allegato",
										onClick: () => setAttachmentZoom((current) => Math.max(1, Math.round((current - .1) * 10) / 10)),
										className: "press inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-foreground",
										children: /* @__PURE__ */ jsx(Minus, { className: "h-3.5 w-3.5" })
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-label": "Adatta allegato allo schermo",
										onClick: () => setAttachmentZoom(1),
										className: "press rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground",
										children: "Adatta"
									})
								]
							})]
						}),
						isAnalysisOpen && (analysis || analysisError) && /* @__PURE__ */ jsxs("section", {
							"aria-label": "Analisi locale della circolare",
							className: "max-h-44 space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-3 text-xs",
							children: [
								/* @__PURE__ */ jsxs("p", {
									className: "flex items-center gap-1.5 font-semibold text-foreground",
									children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5 text-primary" }), "Analisi eseguita sul dispositivo"]
								}),
								analysis && analysis.layout !== "text" && /* @__PURE__ */ jsx("p", {
									className: "rounded-lg bg-primary-soft px-2.5 py-2 leading-relaxed text-primary",
									children: analysis.layout === "timetable" ? "Rilevato un orario settimanale: testo ricostruito rispettando le righe e le distanze tra le celle. Per associare con certezza ogni classe a giorno e ora, controlla la tabella originale." : "Rilevato un layout tabellare: le posizioni delle celle sono state mantenute. Controlla i dati nella tabella originale prima di usarli."
								}),
								analysisError && /* @__PURE__ */ jsx("p", {
									className: "text-destructive",
									children: analysisError
								}),
								analysis && /* @__PURE__ */ jsxs(Fragment, { children: [
									analysis.summary ? /* @__PURE__ */ jsxs("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ jsx("p", {
											className: "font-medium text-foreground",
											children: "In breve"
										}), /* @__PURE__ */ jsx("p", {
											className: "leading-relaxed text-muted-foreground",
											children: analysis.summary
										})]
									}) : analysis.layout !== "text" ? /* @__PURE__ */ jsx("p", {
										className: "text-muted-foreground",
										children: "Riepilogo automatico omesso per non confondere le celle. Date e destinatari riconoscibili sono riportati separatamente; verifica le associazioni nella tabella originale."
									}) : isDocx ? /* @__PURE__ */ jsx("p", {
										className: "text-muted-foreground",
										children: "Non è stato possibile estrarre testo leggibile dal DOCX."
									}) : /* @__PURE__ */ jsx("p", {
										className: "text-muted-foreground",
										children: "Non è stato rilevato testo selezionabile. Il PDF potrebbe essere una scansione: il riconoscimento OCR non è disponibile."
									}),
									analysis.actions.length > 0 && /* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ jsx("p", {
											className: "font-medium text-foreground",
											children: "Cosa fare"
										}), /* @__PURE__ */ jsx("ul", {
											className: "list-disc space-y-1 pl-5 text-muted-foreground",
											children: analysis.actions.map((action, index) => /* @__PURE__ */ jsx("li", { children: action }, `${action}-${index}`))
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ jsxs("p", {
											className: "flex items-center gap-1.5 font-medium text-foreground",
											children: [/* @__PURE__ */ jsx(CalendarDays, { className: "h-3.5 w-3.5 text-primary" }), "Scadenze rilevate"]
										}), analysis.deadlines.length ? analysis.deadlines.map((date, index) => /* @__PURE__ */ jsxs("p", {
											className: "pl-5 text-muted-foreground",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "font-medium text-foreground",
													children: date.value
												}),
												" —",
												" ",
												date.context
											]
										}, `deadline-${index}`)) : /* @__PURE__ */ jsx("p", {
											className: "pl-5 text-muted-foreground",
											children: "Nessuna scadenza riconosciuta."
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ jsxs("p", {
											className: "flex items-center gap-1.5 font-medium text-foreground",
											children: [/* @__PURE__ */ jsx(CalendarDays, { className: "h-3.5 w-3.5 text-primary" }), "Date rilevate"]
										}), analysis.dates.length ? analysis.dates.map((date, index) => /* @__PURE__ */ jsxs("p", {
											className: "pl-5 text-muted-foreground",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "font-medium text-foreground",
													children: date.value
												}),
												" —",
												" ",
												date.context
											]
										}, `${date.value}-${index}`)) : /* @__PURE__ */ jsx("p", {
											className: "pl-5 text-muted-foreground",
											children: "Nessuna data riconosciuta."
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ jsxs("p", {
											className: "flex items-center gap-1.5 font-medium text-foreground",
											children: [/* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5 text-primary" }), "Destinatari"]
										}), /* @__PURE__ */ jsx("p", {
											className: "pl-5 text-muted-foreground",
											children: analysis.recipients.length ? analysis.recipients.join(" · ") : "Non indicati in modo riconoscibile."
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ jsxs("p", {
											className: "flex items-center gap-1.5 font-medium text-foreground",
											children: [/* @__PURE__ */ jsx(Paperclip, { className: "h-3.5 w-3.5 text-primary" }), "Allegati collegati"]
										}), /* @__PURE__ */ jsx("p", {
											className: "pl-5 text-muted-foreground",
											children: analysis.attachments.length ? analysis.attachments.join(" · ") : "Nessun allegato registrato."
										})]
									}),
									/* @__PURE__ */ jsxs("p", {
										className: "text-[10px] text-muted-foreground",
										children: [
											isPdf ? `${analysis.pagesAnalyzed} pagine lette` : "Testo DOCX letto localmente",
											analysis.truncated && isPdf ? " (analisi limitata alle prime 80 pagine o 300.000 caratteri)" : "",
											". Verifica sempre le informazioni sul documento originale."
										]
									})
								] })
							]
						})
					]
				}),
				canAskAi && isAiChatOpen && /* @__PURE__ */ jsxs("section", {
					id: "circular-ai-chat",
					className: "mb-3 shrink-0 space-y-2 rounded-xl border border-primary/25 bg-primary-soft/40 p-3",
					children: [
						/* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsxs("h3", {
								className: "text-xs font-semibold text-foreground",
								children: ["Fai una domanda alla ", documentLabel]
							}),
							/* @__PURE__ */ jsxs("div", {
								role: "group",
								"aria-label": "Modalità di risposta",
								className: `mt-2 grid ${aiModeGridClass} gap-1 rounded-lg bg-background/70 p-1`,
								children: [
									/* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-pressed": effectiveAiMode === "local",
										disabled: isAskingAi,
										onClick: () => chooseAiMode("local"),
										className: `rounded-md px-2 py-1.5 text-[10px] font-medium disabled:opacity-50 ${effectiveAiMode === "local" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`,
										children: "Locale (sul dispositivo)"
									}),
									isOnline && /* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-pressed": effectiveAiMode === "api",
										disabled: isAskingAi,
										onClick: () => chooseAiMode("api"),
										className: `rounded-md px-2 py-1.5 text-[10px] font-medium disabled:opacity-50 ${effectiveAiMode === "api" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`,
										children: "API Groq (Qwen)"
									}),
									isPdf && isOnline && /* @__PURE__ */ jsx("button", {
										type: "button",
										"aria-pressed": effectiveAiMode === "api-vision",
										disabled: isAskingAi,
										onClick: () => chooseAiMode("api-vision"),
										className: `rounded-md px-2 py-1.5 text-[10px] font-medium disabled:opacity-50 ${effectiveAiMode === "api-vision" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`,
										children: "API visiva (Qwen)"
									})
								]
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "mt-1 text-[10px] leading-relaxed text-muted-foreground",
								children: [
									effectiveAiMode === "local" ? "Il testo viene cercato sul dispositivo e non inviato a Groq. La modalità locale mostra passaggi pertinenti, senza generare una risposta." : effectiveAiMode === "api-vision" ? "Solo quando premi Chiedi, vengono inviate a Groq la domanda e le immagini JPEG delle prime 3 pagine PDF. Il documento esce dal dispositivo e la chiamata usa la quota API (eventuali limiti/costi dipendono dall’account). Non vengono inviati titolo, cronologia, voti o presenze." : "Solo quando premi Chiedi, vengono inviati a Groq il testo selezionabile e la domanda corrente. Non vengono inviati titolo, cronologia, voti o presenze.",
									" ",
									!isOnline && /* @__PURE__ */ jsxs("span", {
										className: "font-medium text-primary",
										children: ["Offline: disponibili solo le funzioni Locale.", " "]
									}),
									"Verifica sempre la risposta sul documento originale."
								]
							})
						] }),
						aiDocumentTruncated && effectiveAiMode === "api-vision" && /* @__PURE__ */ jsx("p", {
							className: "rounded-lg bg-warning/10 px-2.5 py-2 text-[10px] text-warning",
							children: "Per l’analisi visiva API sono state inviate solo le prime 3 pagine del PDF."
						}),
						aiDocumentTruncated && effectiveAiMode !== "api-vision" && /* @__PURE__ */ jsx("p", {
							className: "rounded-lg bg-warning/10 px-2.5 py-2 text-[10px] text-warning",
							children: "Testo lungo: per la domanda è stato considerato un estratto. La risposta potrebbe non includere informazioni presenti nelle parti omesse."
						}),
						aiMessages.length > 0 && /* @__PURE__ */ jsxs("div", {
							"aria-live": "polite",
							"aria-label": `Conversazione sulla ${documentLabel}`,
							className: "max-h-36 space-y-2 overflow-y-auto rounded-lg bg-card/80 p-2",
							children: [aiMessages.map((message, index) => /* @__PURE__ */ jsx("div", {
								className: `text-[11px] leading-relaxed ${message.role === "user" ? "text-right text-muted-foreground" : "text-foreground"}`,
								children: message.role === "assistant" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", {
									className: "font-semibold",
									children: "AI:"
								}), /* @__PURE__ */ jsx(AssistantMarkdown, { text: message.text })] }) : /* @__PURE__ */ jsxs("p", {
									className: "whitespace-pre-wrap",
									children: [/* @__PURE__ */ jsx("span", {
										className: "font-semibold",
										children: "Tu: "
									}), message.text]
								})
							}, `${message.role}-${index}`)), isAskingAi && /* @__PURE__ */ jsxs("p", {
								role: "status",
								className: "flex items-center gap-1.5 text-[11px] text-muted-foreground",
								children: [/* @__PURE__ */ jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }), aiProgressMessage ?? `Sto leggendo la ${documentLabel}…`]
							})]
						}),
						aiError && /* @__PURE__ */ jsx("p", {
							className: "text-[11px] text-destructive",
							children: aiError
						}),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: askAiAboutDocument,
							className: "flex gap-2",
							children: [/* @__PURE__ */ jsx("input", {
								value: aiQuestion,
								onChange: (event) => setAiQuestion(event.target.value),
								placeholder: "Es. Entro quando va consegnato?",
								"aria-label": `Domanda sulla ${documentLabel}`,
								maxLength: 1e3,
								className: "min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
							}), /* @__PURE__ */ jsx("button", {
								type: "submit",
								disabled: !aiQuestion.trim() || isAskingAi,
								className: "press rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50",
								children: isAskingAi ? "Attendi" : "Chiedi"
							})]
						})
					]
				}),
				files.length > 1 && /* @__PURE__ */ jsxs("div", {
					className: "mb-3",
					children: [/* @__PURE__ */ jsxs("p", {
						className: "mb-1.5 text-[11px] font-medium text-muted-foreground",
						children: [
							"Allegati (",
							files.length,
							")"
						]
					}), /* @__PURE__ */ jsx("div", {
						role: "tablist",
						"aria-label": "Allegati della circolare",
						className: "flex gap-2 overflow-x-auto pb-1",
						children: files.map((file, index) => /* @__PURE__ */ jsx("button", {
							type: "button",
							role: "tab",
							"aria-selected": index === activeIndex,
							onClick: () => setSelectedIndex(index),
							className: `press max-w-[220px] shrink-0 truncate rounded-lg border px-3 py-2 text-xs font-medium ${index === activeIndex ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground"}`,
							children: file.name ?? `Allegato ${index + 1}`
						}, `${file.path ?? file.name ?? "allegato"}-${index}`))
					})]
				}),
				activeFile?.tableCount && activeFile.tableCount > 0 ? /* @__PURE__ */ jsxs("p", {
					className: "mb-3 inline-flex w-fit rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary",
					children: [
						"Contiene ",
						activeFile.tableCount,
						" ",
						activeFile.tableCount === 1 ? "tabella" : "tabelle"
					]
				}) : null,
				previewUrl && isPdf ? /* @__PURE__ */ jsx("div", {
					className: "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
					children: /* @__PURE__ */ jsx(PdfCanvasPreview, {
						title: activeFile?.name ?? title,
						src: previewUrl,
						zoom: attachmentZoom
					}, activeFile?.path ?? activeFile?.url ?? activeIndex)
				}) : previewUrl && isDocx ? /* @__PURE__ */ jsx("div", {
					className: "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
					children: /* @__PURE__ */ jsx(DocxPreview, {
						title: activeFile?.name ?? title,
						src: previewUrl,
						initialText: extractedText,
						zoom: attachmentZoom
					}, activeFile?.path ?? activeFile?.url ?? activeIndex)
				}) : hasTextOnlyContent ? /* @__PURE__ */ jsxs("div", {
					className: "min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4",
					children: [/* @__PURE__ */ jsx("p", {
						className: "mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
						children: "Testo della comunicazione"
					}), /* @__PURE__ */ jsx("p", {
						className: "whitespace-pre-wrap text-sm leading-relaxed text-foreground",
						children: extractedText
					})]
				}) : /* @__PURE__ */ jsxs("div", {
					className: "flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground",
					children: [/* @__PURE__ */ jsx(FileText, { className: "h-8 w-8" }), /* @__PURE__ */ jsx("p", { children: activeFile?.name ? "Questo formato non ha un’anteprima integrata. Usa il pulsante sotto per aprirlo o scaricarlo." : "Questo allegato non è disponibile." })]
				}),
				downloadUrl && /* @__PURE__ */ jsxs("div", {
					className: `mt-2 grid shrink-0 gap-2 ${previewUrl ? "grid-cols-2" : "grid-cols-1"}`,
					children: [
						isPdf && previewUrl && /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: openAttachment,
							className: "press inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-[10px] font-semibold text-foreground",
							children: [/* @__PURE__ */ jsx(ExternalLink, { className: "h-3.5 w-3.5 shrink-0" }), "Apri PDF"]
						}),
						isDocx && previewUrl && /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: openAttachment,
							className: "press inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-[10px] font-semibold text-foreground",
							children: [/* @__PURE__ */ jsx(ExternalLink, { className: "h-3.5 w-3.5 shrink-0" }), "Apri DOCX"]
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: downloadAttachment,
							disabled: isDownloading,
							className: "press inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-[10px] font-semibold text-primary-foreground",
							children: [/* @__PURE__ */ jsx(Download, { className: "h-3.5 w-3.5 shrink-0" }), isDownloading ? "Download in corso…" : isPdf ? "Scarica PDF" : isDocx ? "Scarica DOCX" : "Scarica allegato"]
						})
					]
				}),
				downloadError && /* @__PURE__ */ jsx("p", {
					className: "mt-2 text-center text-[11px] text-destructive",
					children: downloadError
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => onOpenChange(false),
					className: "sr-only",
					"aria-label": "Chiudi visualizzatore",
					children: /* @__PURE__ */ jsx(X, {})
				})
			]
		})
	});
}
//#endregion
export { CircularViewer };
