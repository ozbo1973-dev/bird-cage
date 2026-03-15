import { describe, it, expect } from "vitest";
import { parseIdentification } from "@/lib/chat";

describe("parseIdentification - photo AI response shapes", () => {
  it("parses a clean JSON block after a summary", () => {
    const text =
      "The Robin is a small passerine bird with an orange-red breast. " +
      'It is common in gardens and woodland edges.\n{"identified": true, "type": "Songbird", "species": "European Robin"}';
    const result = parseIdentification(text);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("Songbird");
    expect(result?.species).toBe("European Robin");
    expect(result?.summary).toContain("Robin");
  });

  it("parses JSON wrapped in markdown fences", () => {
    const text =
      "A large bird of prey commonly seen soaring over open countryside.\n" +
      '```json\n{"identified": true, "type": "Raptor", "species": "Red Kite"}\n```';
    const result = parseIdentification(text);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("Raptor");
    expect(result?.species).toBe("Red Kite");
  });

  it("returns null when identified is false", () => {
    const text = 'I need more information. {"identified": false}';
    expect(parseIdentification(text)).toBeNull();
  });

  it("returns null when JSON block is missing", () => {
    const text = "This looks like a sparrow but I cannot be certain.";
    expect(parseIdentification(text)).toBeNull();
  });

  it("returns null when type or species is missing from JSON", () => {
    const text = 'A bird.\n{"identified": true, "type": "Songbird"}';
    expect(parseIdentification(text)).toBeNull();
  });

  it("extracts summary as text before the JSON block", () => {
    const summary = "The Barn Owl is a nocturnal hunter with a heart-shaped face.";
    const text = `${summary}\n{"identified": true, "type": "Owl", "species": "Barn Owl"}`;
    const result = parseIdentification(text);
    expect(result?.summary).toContain("Barn Owl");
  });

  it("handles multiple JSON-like objects and picks the correct one", () => {
    const text =
      'The user mentioned {"color": "brown"}. Based on this: the bird is a Thrush.\n' +
      '{"identified": true, "type": "Songbird", "species": "Song Thrush"}';
    const result = parseIdentification(text);
    expect(result?.species).toBe("Song Thrush");
  });
});
