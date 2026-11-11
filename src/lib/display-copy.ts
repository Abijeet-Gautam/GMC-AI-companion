export const DISPLAY_MESSAGE_LIMIT = 160;
export function displayMessage(text: string, maximum = DISPLAY_MESSAGE_LIMIT) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximum) return normalized;
  const cut = normalized.slice(0, maximum - 1);
  const boundary = cut.lastIndexOf(" ");
  return `${boundary > maximum * 0.6 ? cut.slice(0, boundary) : cut}…`;
}
