import { afterEach, describe, expect, it, vi } from "vitest";
import {
  answerCircularQuestionOnDevice,
  isOnDeviceCircularAiSupported,
  releaseOnDeviceCircularAi,
} from "@/lib/voto/on-device-circular-ai";

type WorkerCommand = {
  type: "generate";
  requestId: number;
  question: string;
  evidence: string;
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
          data: {
            type: "progress",
            requestId: command.requestId,
            progress: 0.5,
            text: "Carico il modello",
          },
        }),
      );
      this.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "answer",
            requestId: command.requestId,
            answer: "La consegna è venerdì.",
          },
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
  releaseOnDeviceCircularAi();
  vi.unstubAllGlobals();
  FakeWorker.instances = [];
  Reflect.deleteProperty(window.navigator, "gpu");
});

describe("AI generativa locale delle circolari", () => {
  it("non avvia un worker quando WebGPU non è disponibile", async () => {
    Reflect.deleteProperty(window.navigator, "gpu");

    await expect(isOnDeviceCircularAiSupported()).resolves.toBe(false);
    await expect(answerCircularQuestionOnDevice("Quando?", "Testo")).rejects.toThrow(/WebGPU/);
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("avvia il worker solo alla domanda e inoltra progresso e risposta", async () => {
    setGpuAdapter({});
    vi.stubGlobal("Worker", FakeWorker);
    const onProgress = vi.fn();

    await expect(
      answerCircularQuestionOnDevice(
        "Quando si consegna?",
        "[Pagina 1] Entro venerdì.",
        onProgress,
      ),
    ).resolves.toBe("La consegna è venerdì.");

    const worker = FakeWorker.instances[0];
    expect(FakeWorker.instances).toHaveLength(1);
    expect(worker?.scriptUrl).toBeInstanceOf(URL);
    expect(worker?.options).toMatchObject({ type: "module" });
    expect(worker?.messages[0]).toMatchObject({
      type: "generate",
      question: "Quando si consegna?",
      evidence: "[Pagina 1] Entro venerdì.",
    });
    expect(onProgress).toHaveBeenCalledWith({ progress: 0.5, text: "Carico il modello" });

    releaseOnDeviceCircularAi();
    expect(worker?.terminated).toBe(true);
  });
});
