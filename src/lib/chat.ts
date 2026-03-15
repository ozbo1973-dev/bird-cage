export interface BirdIdentification {
  type: string;
  species: string;
  summary: string;
}

/** Parses the JSON identification block the AI embeds in its final response. */
export function parseIdentification(text: string): BirdIdentification | null {
  // Strip markdown code fences so we can find bare JSON objects
  const stripped = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1");

  // Find every { ... } candidate and try each
  const candidates = stripped.matchAll(/\{[\s\S]*?\}/g);
  for (const match of candidates) {
    try {
      const data = JSON.parse(match[0]);
      if (data.identified && data.type && data.species) {
        const jsonIndex = text.indexOf(match[0].trim().slice(0, 20));
        const summary = text.slice(0, jsonIndex >= 0 ? jsonIndex : 0).replace(/```(?:json)?/g, "").trim();
        return { type: data.type, species: data.species, summary };
      }
    } catch {
      // not valid JSON, try next
    }
  }
  return null;
}
