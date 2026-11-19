import { Capacitor, registerPlugin } from "@capacitor/core";

export type LocalLlmStatus = {
  supported: boolean;
  state: "unsupported" | "not-installed" | "downloading" | "verifying" | "ready" | "error";
  downloadedBytes: number;
  totalBytes: number;
  progress: number;
  errorMessage?: string;
};

type LocalLlmPlugin = {
  getStatus(): Promise<LocalLlmStatus>;
  downloadModel(): Promise<void>;
  cancelDownload(): Promise<void>;
  deleteModel(): Promise<void>;
  generate(options: { prompt: string }): Promise<{ text: string }>;
};

const LocalLlm = registerPlugin<LocalLlmPlugin>("LocalLlm");
const unavailable = "Il modello locale è disponibile solo nell'app Android supportata.";

export function isOnDeviceLlmAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function getOnDeviceLlmStatus(): Promise<LocalLlmStatus> {
  if (!isOnDeviceLlmAvailable()) {
    return {
      supported: false,
      state: "unsupported",
      downloadedBytes: 0,
      totalBytes: 0,
      progress: 0,
    };
  }
  return LocalLlm.getStatus();
}

function requireAndroid(): void {
  if (!isOnDeviceLlmAvailable()) throw new Error(unavailable);
}

export async function downloadOnDeviceLlm(): Promise<void> {
  requireAndroid();
  await LocalLlm.downloadModel();
}

export async function cancelOnDeviceLlmDownload(): Promise<void> {
  requireAndroid();
  await LocalLlm.cancelDownload();
}

export async function deleteOnDeviceLlm(): Promise<void> {
  requireAndroid();
  await LocalLlm.deleteModel();
}

export async function generateOnDeviceLlm(prompt: string): Promise<string> {
  requireAndroid();
  const result = await LocalLlm.generate({ prompt });
  return result.text;
}
