export const MAX_CUSTOM_THEME_BACKGROUND_LENGTH = 950_000;
const MAX_INPUT_FILE_BYTES = 24 * 1024 * 1024;
const MAX_OUTPUT_FILE_BYTES = 700 * 1024;
const MAX_IMAGE_SIDE = 1920;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BACKGROUND_DATA_URL =
  /^data:image\/(?:jpeg|png|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function isValidCustomThemeBackground(value: unknown): value is string {
  return (
    value === "" ||
    (typeof value === "string" &&
      value.length <= MAX_CUSTOM_THEME_BACKGROUND_LENGTH &&
      BACKGROUND_DATA_URL.test(value))
  );
}

export function sanitizeCustomThemeBackground(value: unknown): string {
  return isValidCustomThemeBackground(value) ? value : "";
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function blobDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Non riesco a preparare l’immagine."));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Formato immagine non valido."));
    reader.readAsDataURL(blob);
  });
}

export async function processCustomThemeBackground(file: File, fallbackColor: string) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Scegli un’immagine JPG, PNG o WebP.");
  }
  if (!file.size || file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error("L’immagine deve pesare meno di 24 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    try {
      await image.decode();
    } catch {
      throw new Error("Non riesco ad aprire questo file immagine.");
    }

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (!naturalWidth || !naturalHeight) {
      throw new Error("Le dimensioni dell’immagine non sono valide.");
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Il browser non può elaborare questa immagine.");

    let scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(naturalWidth, naturalHeight));
    let quality = 0.84;
    const backdrop = /^#[\da-f]{6}$/i.test(fallbackColor) ? fallbackColor : "#12151c";

    for (let attempt = 0; attempt < 8; attempt += 1) {
      canvas.width = Math.max(1, Math.round(naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(naturalHeight * scale));
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.fillStyle = backdrop;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const webp = await canvasBlob(canvas, "image/webp", quality);
      let output = webp?.type === "image/webp" ? webp : null;
      if (!output || output.size > MAX_OUTPUT_FILE_BYTES) {
        output = await canvasBlob(canvas, "image/jpeg", quality);
      }

      if (output && output.size <= MAX_OUTPUT_FILE_BYTES) {
        const dataUrl = await blobDataUrl(output);
        if (isValidCustomThemeBackground(dataUrl)) return dataUrl;
      }

      scale *= 0.82;
      quality = Math.max(0.55, quality - 0.05);
    }

    throw new Error("L’immagine è troppo complessa. Prova con una foto più piccola.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
