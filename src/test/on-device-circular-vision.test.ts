import { afterEach, describe, expect, it, vi } from "vitest";
import {
  answerCircularQuestionVisuallyOnDevice,
  downloadOnDeviceVisionModel,
  isOnDeviceVisionAiSupported,
  isOnDeviceVisionModelDownloaded,
  ON_DEVICE_VISION_MODEL_STORAGE_KEY,
  releaseOnDeviceCircularVision,
} from "@/lib/voto/on-device-circular-vision";

type WorkerCommand = {
  type: "generate" | "prepare";
  requestId: number;
  question?: string;
  imageUrls?: string[];
};

class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = [];
  readonly messages: WorkerCommand[] = [];
  terminated = false;

  constructor(
    readonly scriptUrl: URL | string,
    readonly options?: WorkerOptions,
  ) {
    super();
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown) {
    const command = message as WorkerCommand;
    this.messages.push(command);
    queueMicrotask(() => {
      this.dispatchEvent(
        new MessageEvent("message", {
          data:
            command.type === "prepare"
              ? { type: "ready", requestId: command.requestId }
              : { type: "answer", requestId: command.requestId, answer: "Scadenza: 30 novembre." },
        }),
      );
    });
  }

  terminate() {
    this.terminated = true;
  }
}

function setGpuAdapter(adapter: object | null) {
  Object.defineProperty(window.navigator, "gpu", {
    configurable: true,
    value: { requestAdapter: vi.fn().mockResolvedValue(adapter) },
  });
}

afterEach(() => {
  releaseOnDeviceCircularVision();
  vi.unstubAllGlobals();
  localStorage.removeItem(ON_DEVICE_VISION_MODEL_STORAGE_KEY);
  FakeWorker.instances = [];
  Reflect.deleteProperty(window.navigator, "gpu");
});

describe("Qwen2-VL locale per le circolari", () => {
  it("richiede WebGPU e non avvia worker quando non è disponibile", async () => {
    Reflect.deleteProperty(window.navigator, "gpu");

    await expect(isOnDeviceVisionAiSupported()).resolves.toBe(false);
    await expect(downloadOnDeviceVisionModel()).rejects.toThrow(/WebGPU/);
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("scarica solo su richiesta esplicita e inoltra le immagini al worker visivo", async () => {
    setGpuAdapter({});
    vi.stubGlobal("Worker", FakeWorker);

    await downloadOnDeviceVisionModel();
    expect(isOnDeviceVisionModelDownloaded()).toBe(true);

    await expect(
      answerCircularQuestionVisuallyOnDevice("Quando scade?", [
        { pageNumber: 1, dataUrl: "data:image/jpeg;base64,AA==" },
      ]),
    ).resolves.toBe("Scadenza: 30 novembre.");

    const worker = FakeWorker.instances[0];
    expect(worker?.scriptUrl).toBeInstanceOf(URL);
    expect(worker?.options).toMatchObject({ type: "module" });
    expect(worker?.messages[0]?.type).toBe("prepare");
    expect(worker?.messages[1]).toMatchObject({
      type: "generate",
      question: "Quando scade?",
      imageUrls: ["data:image/jpeg;base64,AA=="],
    });
  });

  it("rifiuta una domanda se non è stato scaricato il modello", async () => {
    setGpuAdapter({});
    vi.stubGlobal("Worker", FakeWorker);

    await expect(
      answerCircularQuestionVisuallyOnDevice("Quando scade?", [
        { pageNumber: 1, dataUrl: "data:image/jpeg;base64,AA==" },
      ]),
    ).rejects.toThrow(/Impostazioni/);
    expect(FakeWorker.instances).toHaveLength(0);
  });
});
