export interface BirdIdentification {
  type: string;
  species: string;
  summary: string;
}

/** Parses the JSON identification block the AI embeds in its final response. */
export function parseIdentification(text: string): BirdIdentification | null {
  const match = text.match(/\{"identified":\s*true[^}]+\}/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[0]);
    if (data.identified && data.type && data.species) {
      const summary = text.slice(0, match.index).trim();
      return { type: data.type, species: data.species, summary };
    }
  } catch {
    // malformed JSON
  }
  return null;
}
