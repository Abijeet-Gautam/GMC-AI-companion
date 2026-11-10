import { AppError } from "@/server/http";
// Local checks are a first barrier; AI output also uses provider moderation.
// Offline mode publishes curated text, never unmoderated raw visitor text.
const blocked = [
  /[\w.+-]+\s*@\s*[\w.-]+\.[a-z]{2,}/i,
  /(?:\+?\d[\s().-]*){7,}/,
  /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|bt)\b)/i,
  /\b(?:my name is|i am called|call me at|contact me|my address|i live at|passport|password|credit card)\b/i,
  /\b(?:kill|murder|rape|suicide|porn|nazi|fuck\w*|shit\w*|bitch\w*|idiot\w*|hate|stupid)\b/i,
  /\b(?:ignore (?:all |previous |the )*instructions|system prompt|developer message|jailbreak|return json|output exactly|buy now|vote for|invest in)\b/i,
];
export function checkText(text: string) {
  const normalized = text
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "");
  if (blocked.some((pattern) => pattern.test(normalized)))
    throw new AppError(
      "Please share a hopeful message without personal details, links, advertising or harmful language.",
      422,
      "MODERATION_REJECTED",
    );
}
export function rejectUnsafe(): never {
  throw new AppError(
    "Please rephrase your hope so it can be shared safely with everyone.",
    422,
    "MODERATION_REJECTED",
  );
}
