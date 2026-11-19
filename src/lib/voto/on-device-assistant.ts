import { generateOnDeviceLlm } from "@/lib/native-local-llm";

export const MAX_ON_DEVICE_QUESTION = 2_000;
export const MAX_ON_DEVICE_DOCUMENT = 10_000;
export const MAX_ON_DEVICE_ANSWER = 4_000;

export async function answerOnDeviceGeneralQuestion(question: string): Promise<string> {
  const answer = await generateOnDeviceLlm(
    `Rispondi in italiano in modo utile e conciso. Non inventare fatti se non sei sicuro.\nDomanda: ${question.slice(0, MAX_ON_DEVICE_QUESTION)}`,
  );
  return answer.slice(0, MAX_ON_DEVICE_ANSWER);
}

export async function answerOnDeviceDocument(
  question: string,
  documentText: string,
): Promise<string> {
  const answer = await generateOnDeviceLlm(
    `Rispondi in italiano in modo conciso basandoti solo sul testo; se non basta, dillo.\nDomanda: ${(question || "Riassumi il documento").slice(0, 1_000)}\nTesto: ${documentText.slice(0, MAX_ON_DEVICE_DOCUMENT)}`,
  );
  return answer.slice(0, MAX_ON_DEVICE_ANSWER);
}
