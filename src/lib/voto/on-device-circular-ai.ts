export interface OnDeviceModelProgress {
  progress: number;
  text: string;
}

export type OnDeviceProgressCallback = (progress: OnDeviceModelProgress) => void;

type BrowserGpu = {
  requestAdapter: () => Promise<unknown | null>;
};

type BrowserNavigator = Navigator & { gpu?: BrowserGpu };

type WorkerReply =
  | ({ type: "progress" } & OnDeviceModelProgress & { requestId: number })
  | { type: "answer"; requestId: number; answer: string }
  | { type: "error"; requestId: number; message: string };

type PendingRequest = {
  resolve: (answer: string) => void;
  reject: (error: Error) => void;
  onProgress: OnDeviceProgressCallback | undefined;
};

let modelWorker: Worker | null = null;
let nextRequestId = 0;
const pendingRequests = new Map<number, PendingRequest>();

export async function isOnDeviceCircularAiSupported(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;

  try {
    const gpu = (navigator as BrowserNavigator).gpu;
    return Boolean(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

function rejectPendingRequests(message: string) {
  const requests = [...pendingRequests.values()];
  pendingRequests.clear();
  for (const request of requests) request.reject(new Error(message));
}

function getModelWorker(): Worker {
  if (modelWorker) return modelWorker;

  const worker = new Worker(new URL("./on-device-circular-ai.worker.ts", import.meta.url), {
    type: "module",
  });
  modelWorker = worker;

  worker.addEventListener("message", (event: MessageEvent<WorkerReply>) => {
    const reply = event.data;
    const pending = pendingRequests.get(reply.requestId);
    if (!pending) return;

    if (reply.type === "progress") {
      pending.onProgress?.({ progress: reply.progress, text: reply.text });
      return;
    }

    pendingRequests.delete(reply.requestId);
    if (reply.type === "answer") pending.resolve(reply.answer);
    else pending.reject(new Error(reply.message));
  });

  worker.addEventListener("error", () => {
    if (modelWorker !== worker) return;
    modelWorker = null;
    worker.terminate();
    rejectPendingRequests("Il worker AI sul telefono si è interrotto.");
  });

  return worker;
}

export async function answerCircularQuestionOnDevice(
  question: string,
  evidence: string,
  onProgress?: OnDeviceProgressCallback,
): Promise<string> {
  if (!(await isOnDeviceCircularAiSupported())) {
    throw new Error("Questo browser o telefono non supporta WebGPU per l’AI locale.");
  }

  return new Promise<string>((resolve, reject) => {
    const requestId = ++nextRequestId;
    pendingRequests.set(requestId, { resolve, reject, onProgress });

    try {
      getModelWorker().postMessage({ type: "generate", requestId, question, evidence });
    } catch {
      pendingRequests.delete(requestId);
      reject(new Error("Non è stato possibile avviare il worker AI sul telefono."));
    }
  });
}

export function releaseOnDeviceCircularAi(): void {
  const worker = modelWorker;
  modelWorker = null;
  worker?.terminate();
  rejectPendingRequests("La modalità AI sul telefono è stata chiusa.");
}
