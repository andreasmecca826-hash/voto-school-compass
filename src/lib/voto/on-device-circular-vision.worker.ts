import {
  AutoProcessor,
  Qwen2VLForConditionalGeneration,
  RawImage,
  Tensor,
} from "@huggingface/transformers";

const MODEL_ID = "onnx-community/Qwen2-VL-2B-Instruct";
const DTYPE = "q4f16" as const;

let processorPromise: ReturnType<typeof AutoProcessor.from_pretrained> | null = null;
let modelPromise: ReturnType<typeof Qwen2VLForConditionalGeneration.from_pretrained> | null = null;

function progressCallback(requestId: number) {
  return (info: { status?: string; progress?: number; file?: string }) => {
    if (info.status !== "progress_total" && info.status !== "progress") return;
    const progress = Math.max(0, Math.min(1, (info.progress ?? 0) / 100));
    self.postMessage({
      type: "progress",
      requestId,
      progress,
      text: info.file ? `Scaricamento ${info.file.split("/").at(-1)}` : "Scaricamento Qwen2-VL…",
    });
  };
}

async function getModel(requestId: number) {
  processorPromise ??= AutoProcessor.from_pretrained(MODEL_ID, {
    progress_callback: progressCallback(requestId),
    max_pixels: 1280 * 28 * 28,
  });
  modelPromise ??= Qwen2VLForConditionalGeneration.from_pretrained(MODEL_ID, {
    device: "webgpu",
    dtype: DTYPE,
    progress_callback: progressCallback(requestId),
  });
  const [processor, model] = await Promise.all([processorPromise, modelPromise]);
  return { processor, model };
}

self.addEventListener("message", async (event: MessageEvent) => {
  const { type, requestId, question, imageUrls } = event.data as {
    type: "prepare" | "generate";
    requestId: number;
    question?: string;
    imageUrls?: string[];
  };

  try {
    const { processor, model } = await getModel(requestId);
    if (type === "prepare") {
      self.postMessage({ type: "ready", requestId });
      return;
    }
    if (!question?.trim() || !imageUrls?.length) throw new Error("Domanda o pagine PDF mancanti.");

    const images = await Promise.all(imageUrls.map((url) => RawImage.read(url)));
    const content = images.flatMap((_, index) => [
      { type: "text" as const, text: `Pagina ${index + 1} della circolare:` },
      { type: "image" as const },
    ]);
    content.push({
      type: "text" as const,
      text: `Rispondi in italiano usando esclusivamente ciò che è visibile nelle pagine. Se il dato non si legge o non compare, dillo chiaramente senza inventare. Domanda: ${question}`,
    });
    const conversation = [{ role: "user" as const, content }];
    const prompt = processor.apply_chat_template(conversation, { add_generation_prompt: true });
    const inputs = await processor(prompt, images, { max_pixels: 1280 * 28 * 28 });
    const outputs = await model.generate({ ...inputs, max_new_tokens: 256, do_sample: false });
    const sequences =
      outputs instanceof Tensor ? outputs : (outputs as { sequences?: Tensor }).sequences;
    if (!sequences) throw new Error("Il modello non ha restituito una risposta leggibile.");
    const answer = processor.batch_decode(
      sequences.slice(null, [inputs.input_ids.dims.at(-1), null]),
      { skip_special_tokens: true },
    )[0];
    self.postMessage({
      type: "answer",
      requestId,
      answer: answer?.trim() || "Non sono riuscito a leggere la circolare.",
    });
  } catch (error) {
    processorPromise = null;
    modelPromise = null;
    self.postMessage({
      type: "error",
      requestId,
      message:
        error instanceof Error
          ? error.message
          : type === "generate"
            ? "Errore del modello visivo sul dispositivo."
            : "Download del modello visivo non riuscito.",
    });
  }
});
