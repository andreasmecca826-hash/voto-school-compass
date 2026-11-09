import type { OnDeviceModelProgress, OnDeviceProgressCallback } from "./on-device-circular-ai";

export const ON_DEVICE_VISION_MODEL_ID = "onnx-community/Qwen2-VL-2B-Instruct";
export const ON_DEVICE_VISION_MODEL_STORAGE_KEY = "voto.on-device-vision-model-ready.v1";

interface VisionPageImage {
  pageNumber: number;
  dataUrl: string;
}

type WorkerReply =
  | ({ type: "progress" } & OnDeviceModelProgress & { requestId: number })
  | { type: "ready"; requestId: number }
  | { type: "answer"; requestId: number; answer: string }
  | { type: "error"; requestId: number; message: string };

type PendingRequest = {
  kind: "download" | "answer";
  resolve: (value?: string) => void;
  reject: (error: Error) => void;
  onProgress?: OnDeviceProgressCallback | undefined;
};

let worker: Worker | null = null;
let requestSequence = 0;
const pending = new Map<number, PendingRequest>();

export async function isOnDeviceVisionAiSupported(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    const gpu = (
      navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown | null> } }
    ).gpu;
    return Boolean(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

export function isOnDeviceVisionModelDownloaded(): boolean {
  try {
    return window.localStorage.getItem(ON_DEVICE_VISION_MODEL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setDownloaded(value: boolean) {
  try {
    if (value) window.localStorage.setItem(ON_DEVICE_VISION_MODEL_STORAGE_KEY, "true");
    else window.localStorage.removeItem(ON_DEVICE_VISION_MODEL_STORAGE_KEY);
  } catch {
    // La cache del browser può mantenere il modello anche se localStorage non è disponibile.
  }
}

function getWorker(): Worker {
  if (worker) return worker;
  const instance = new Worker(new URL("./on-device-circular-vision.worker.ts", import.meta.url), {
    type: "module",
  });
  worker = instance;
  instance.addEventListener("message", (event: MessageEvent<WorkerReply>) => {
    const reply = event.data;
    const request = pending.get(reply.requestId);
    if (!request) return;
    if (reply.type === "progress") {
      request.onProgress?.({ progress: reply.progress, text: reply.text });
      return;
    }
    pending.delete(reply.requestId);
    if (reply.type === "ready" && request.kind === "download") {
      setDownloaded(true);
      request.resolve();
    } else if (reply.type === "answer" && request.kind === "answer") {
      request.resolve(reply.answer);
    } else if (reply.type === "error") {
      request.reject(new Error(reply.message));
    } else {
      request.reject(new Error("Risposta inattesa dal worker Qwen2-VL."));
    }
  });
  instance.addEventListener("error", () => {
    if (worker !== instance) return;
    worker = null;
    instance.terminate();
    for (const request of pending.values())
      request.reject(new Error("Worker Qwen2-VL interrotto."));
    pending.clear();
  });
  return instance;
}

function sendRequest<T extends string | void>(
  kind: "download" | "answer",
  message: Record<string, unknown>,
  onProgress?: OnDeviceProgressCallback,
): Promise<T> {
  const requestId = ++requestSequence;
  return new Promise<T>((resolve, reject) => {
    pending.set(requestId, {
      kind,
      resolve: (value) => resolve(value as T),
      reject,
      onProgress,
    });
    try {
      getWorker().postMessage({ ...message, requestId });
    } catch {
      pending.delete(requestId);
      reject(new Error("Non è stato possibile avviare il worker Qwen2-VL."));
    }
  });
}

export async function downloadOnDeviceVisionModel(
  onProgress?: OnDeviceProgressCallback,
): Promise<void> {
  if (!(await isOnDeviceVisionAiSupported())) {
    throw new Error("Questo browser o telefono non supporta WebGPU per Qwen2-VL.");
  }
  if (isOnDeviceVisionModelDownloaded()) return;
  await sendRequest<void>("download", { type: "prepare" }, onProgress);
}

export async function answerCircularQuestionVisuallyOnDevice(
  question: string,
  pageImages: VisionPageImage[],
  onProgress?: OnDeviceProgressCallback,
): Promise<string> {
  if (!(await isOnDeviceVisionAiSupported())) {
    throw new Error("Questo browser o telefono non supporta WebGPU per Qwen2-VL.");
  }
  if (!isOnDeviceVisionModelDownloaded()) {
    throw new Error("Scarica prima il modello visivo da Impostazioni > AI sul dispositivo.");
  }
  if (pageImages.length === 0)
    throw new Error("Non ci sono immagini delle pagine PDF da analizzare.");
  return sendRequest<string>(
    "answer",
    { type: "generate", question, imageUrls: pageImages.map(({ dataUrl }) => dataUrl) },
    onProgress,
  );
}

export function releaseOnDeviceCircularVision(): void {
  const activeWorker = worker;
  worker = null;
  activeWorker?.terminate();
  for (const request of pending.values()) request.reject(new Error("Analisi visiva interrotta."));
  pending.clear();
}
