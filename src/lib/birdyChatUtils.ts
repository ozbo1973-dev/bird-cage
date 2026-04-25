const TITLE_MAX_LENGTH = 60;

/**
 * Returns a pre-filled title for a new discussion.
 * Truncates the first user message to 60 chars. Falls back to a date string.
 */
export function getTitlePreFill(firstUserMessage?: string, now: Date = new Date()): string {
  const trimmed = firstUserMessage?.trim() ?? "";
  if (!trimmed) {
    const dateStr = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `Chat - ${dateStr}`;
  }
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return trimmed.slice(0, TITLE_MAX_LENGTH) + "...";
}
