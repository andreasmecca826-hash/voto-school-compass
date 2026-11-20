import { Capacitor, registerPlugin } from "@capacitor/core";

export type LocalModelId = "qwen3-4b" | "gemma3n-e2b" | "qwen3-1.7b" | "qwen3-0.6b";
export type LocalLlmState =
  "unsupported" | "not-installed" | "downloading" | "verifying" | "ready" | "error";
export type LocalModelInfo = {
  id: LocalModelId;
  label: string;
  modelName: string;
  sizeBytes: number;
  requiredFreeBytes: number;
  compatibility: string;
  recommendedFor: string;
  license: string;
  sourceUrl: string;
  note?: string;
};
export type LocalLlmStatus = {
  modelId: LocalModelId;
  supported: boolean;
  state: LocalLlmState;
  downloadedBytes: number;
  totalBytes: number;
  requiredFreeBytes: number;
  availableBytes: number;
  progress: number;
  errorMessage?: string;
};

type LocalLlmPlugin = {
  getCatalog(): Promise<{ models: LocalModelInfo[] }>;
  getSelectedModel(): Promise<{ modelId: LocalModelId | null }>;
  selectModel(options: { modelId: LocalModelId }): Promise<void>;
  getStatus(options: { modelId: LocalModelId }): Promise<LocalLlmStatus>;
  downloadModel(options: { modelId: LocalModelId }): Promise<void>;
  cancelDownload(options: { modelId: LocalModelId }): Promise<void>;
  deleteModel(options: { modelId: LocalModelId }): Promise<void>;
  generate(options: {
    prompt: string;
    modelId?: LocalModelId;
  }): Promise<{ text: string; modelId: LocalModelId }>;
};

const LocalLlm = registerPlugin<LocalLlmPlugin>("LocalLlm");
const unavailable = "I modelli locali sono disponibili solo nell'app Android supportata.";

export const LOCAL_MODEL_CATALOG: LocalModelInfo[] = [
  {
    id: "qwen3-4b",
    label: "Locale Potente",
    modelName: "Qwen3 4B · LiteRT-LM int4",
    sizeBytes: 2_272_935_936,
    requiredFreeBytes: 2_500_000_000,
    compatibility: "Android arm64 con almeno 8 GB RAM",
    recommendedFor: "telefoni potenti",
    license: "Apache-2.0",
    sourceUrl: "https://huggingface.co/litert-community/Qwen3-4B",
    note: "Conversione LiteRT-LM int4, non il file GGUF Q4_K_M.",
  },
  {
    id: "gemma3n-e2b",
    label: "Locale Media",
    modelName: "Gemma 3n E2B-it · LiteRT-LM int4",
    sizeBytes: 3_655_827_456,
    requiredFreeBytes: 3_900_000_000,
    compatibility: "Android arm64 con almeno 8 GB RAM",
    recommendedFor: "uso multimodale compatibile",
    license: "Gemma Terms of Use",
    sourceUrl: "https://huggingface.co/warped-community/gemma-3n-E2B-it-litert-lm",
    note: "Conversione LiteRT-LM pubblica della famiglia Gemma 3n; verificare i termini Gemma prima dell’uso commerciale.",
  },
  {
    id: "qwen3-1.7b",
    label: "Locale Leggera",
    modelName: "Qwen3 1.7B · LiteRT-LM int4",
    sizeBytes: 977_184_032,
    requiredFreeBytes: 1_200_000_000,
    compatibility: "Android arm64 con almeno 4 GB RAM",
    recommendedFor: "telefoni medi e potenti",
    license: "Apache-2.0",
    sourceUrl: "https://huggingface.co/litert-community/Qwen3-1.7B",
    note: "File LiteRT-LM dynamic int4 ufficiale; non è un GGUF.",
  },
  {
    id: "qwen3-0.6b",
    label: "Locale Ultra Leggera",
    modelName: "Qwen3 0.6B · LiteRT-LM",
    sizeBytes: 613_722_264,
    requiredFreeBytes: 750_000_000,
    compatibility: "Android arm64 con poca RAM",
    recommendedFor: "telefoni con poca RAM",
    license: "Apache-2.0",
    sourceUrl: "https://huggingface.co/litert-community/Qwen3-0.6B",
  },
];

export function isOnDeviceLlmAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
export async function getLocalModelCatalog(): Promise<LocalModelInfo[]> {
  if (!isOnDeviceLlmAvailable()) return LOCAL_MODEL_CATALOG;
  try {
    return (await LocalLlm.getCatalog()).models;
  } catch {
    return LOCAL_MODEL_CATALOG;
  }
}
export async function getSelectedLocalModel(): Promise<LocalModelId | null> {
  if (!isOnDeviceLlmAvailable()) return null;
  return (await LocalLlm.getSelectedModel()).modelId;
}
export async function selectLocalModel(modelId: LocalModelId): Promise<void> {
  if (!isOnDeviceLlmAvailable()) throw new Error(unavailable);
  await LocalLlm.selectModel({ modelId });
}
export async function getOnDeviceLlmStatus(modelId: LocalModelId): Promise<LocalLlmStatus> {
  if (!isOnDeviceLlmAvailable()) {
    const model = LOCAL_MODEL_CATALOG.find((item) => item.id === modelId) ?? LOCAL_MODEL_CATALOG[3];
    return {
      modelId,
      supported: false,
      state: "unsupported",
      downloadedBytes: 0,
      totalBytes: model.sizeBytes,
      requiredFreeBytes: model.requiredFreeBytes,
      availableBytes: 0,
      progress: 0,
    };
  }
  return LocalLlm.getStatus({ modelId });
}
export async function downloadOnDeviceLlm(modelId: LocalModelId): Promise<void> {
  if (!isOnDeviceLlmAvailable()) throw new Error(unavailable);
  await LocalLlm.downloadModel({ modelId });
}
export async function cancelOnDeviceLlmDownload(modelId: LocalModelId): Promise<void> {
  if (!isOnDeviceLlmAvailable()) throw new Error(unavailable);
  await LocalLlm.cancelDownload({ modelId });
}
export async function deleteOnDeviceLlm(modelId: LocalModelId): Promise<void> {
  if (!isOnDeviceLlmAvailable()) throw new Error(unavailable);
  await LocalLlm.deleteModel({ modelId });
}
export async function generateOnDeviceLlm(prompt: string, modelId?: LocalModelId): Promise<string> {
  if (!isOnDeviceLlmAvailable()) throw new Error(unavailable);
  return (await LocalLlm.generate({ prompt, modelId })).text;
}
