import { describe, it, expect } from "vitest";
import { parseIdentification } from "@/lib/chat";

describe("parseIdentification - photo AI response shapes", () => {
  it("parses a clean JSON block after a summary", () => {
    const text =
      "The Robin is a small passerine bird with an orange-red breast. " +
      'It is common in gardens and woodland edges.\n{"identified": true, "type": "Songbird", "species": "European Robin"}';
    const result = parseIdentification(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("Songbird");
      expect(result.value.species).toBe("European Robin");
      expect(result.value.summary).toContain("Robin");
    }
  });

  it("parses JSON wrapped in markdown fences", () => {
    const text =
      "A large bird of prey commonly seen soaring over open countryside.\n" +
      '```json\n{"identified": true, "type": "Raptor", "species": "Red Kite"}\n```';
    const result = parseIdentification(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("Raptor");
      expect(result.value.species).toBe("Red Kite");
    }
  });

  it("returns not_identified when identified is false", () => {
    const text = 'I need more information. {"identified": false}';
    const result = parseIdentification(text);
    expect(result).toEqual({ ok: false, reason: "not_identified" });
  });

  it("returns parse_error when JSON block is missing", () => {
    const text = "This looks like a sparrow but I cannot be certain.";
    const result = parseIdentification(text);
    expect(result).toEqual({ ok: false, reason: "parse_error" });
  });

  it("returns parse_error when type or species is missing from JSON", () => {
    const text = 'A bird.\n{"identified": true, "type": "Songbird"}';
    const result = parseIdentification(text);
    expect(result).toEqual({ ok: false, reason: "parse_error" });
  });

  it("extracts summary as text before the JSON block", () => {
    const summary = "The Barn Owl is a nocturnal hunter with a heart-shaped face.";
    const text = `${summary}\n{"identified": true, "type": "Owl", "species": "Barn Owl"}`;
    const result = parseIdentification(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.summary).toContain("Barn Owl");
    }
  });

  it("handles multiple JSON-like objects and picks the correct one", () => {
    const text =
      'The user mentioned {"color": "brown"}. Based on this: the bird is a Thrush.\n' +
      '{"identified": true, "type": "Songbird", "species": "Song Thrush"}';
    const result = parseIdentification(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.species).toBe("Song Thrush");
    }
  });
});
