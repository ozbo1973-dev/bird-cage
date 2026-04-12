/** Documents the JSON shape the AI is required to produce. Single source of truth. */
export interface BirdIdentificationPayload {
  identified: true;
  type: string;
  species: string;
}

export interface BirdIdentification {
  type: string;
  species: string;
  summary: string;
}

export type ParseResult =
  | { ok: true; value: BirdIdentification }
  | { ok: false; reason: "not_identified" } // AI deliberately said no bird — valid response
  | { ok: false; reason: "parse_error" }; // malformed / no JSON found — unexpected

/** Parses the JSON identification block the AI embeds in its final response. */
export function parseIdentification(text: string): ParseResult {
  // Strip markdown code fences so we can find bare JSON objects
  const stripped = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1");

  // Find every { ... } candidate and try each
  const candidates = stripped.matchAll(/\{[\s\S]*?\}/g);
  let foundNotIdentified = false;

  for (const match of candidates) {
    try {
      const data = JSON.parse(match[0]);
      if (data.identified === true && data.type && data.species) {
        const jsonIndex = text.indexOf(match[0].trim().slice(0, 20));
        const summary = text.slice(0, jsonIndex >= 0 ? jsonIndex : 0).replace(/```(?:json)?/g, "").trim();
        return { ok: true, value: { type: data.type, species: data.species, summary } };
      }
      if (data.identified === false) {
        foundNotIdentified = true;
      }
    } catch {
      // not valid JSON, try next
    }
  }

  return { ok: false, reason: foundNotIdentified ? "not_identified" : "parse_error" };
}
