import { describe, it, expect } from "vitest";
import { parseIdentification } from "@/lib/chat";

describe("parseIdentification", () => {
  it("returns parse_error when no JSON block present", () => {
    const result = parseIdentification("That looks like a sparrow!");
    expect(result).toEqual({ ok: false, reason: "parse_error" });
  });

  it("parses a valid identification block", () => {
    const text = `Based on your description, I can identify this bird.
{"identified": true, "type": "Songbird", "species": "American Robin"}
It has a red breast and dark back.`;
    const result = parseIdentification(text);
    expect(result).toEqual({
      ok: true,
      value: {
        type: "Songbird",
        species: "American Robin",
        summary: "Based on your description, I can identify this bird.",
      },
    });
  });

  it("includes empty summary when JSON block is at start", () => {
    const text = `{"identified": true, "type": "Raptor", "species": "Osprey"}`;
    const result = parseIdentification(text);
    expect(result).toEqual({
      ok: true,
      value: { type: "Raptor", species: "Osprey", summary: "" },
    });
  });

  it("returns not_identified when identified is false", () => {
    const text = `{"identified": false, "type": "Unknown", "species": "Unknown"}`;
    const result = parseIdentification(text);
    expect(result).toEqual({ ok: false, reason: "not_identified" });
  });

  it("returns parse_error for malformed JSON", () => {
    const text = `{"identified": true, "type": "Raptor" broken`;
    const result = parseIdentification(text);
    expect(result).toEqual({ ok: false, reason: "parse_error" });
  });

  it("returns parse_error when type is missing", () => {
    const text = `{"identified": true, "species": "Osprey"}`;
    const result = parseIdentification(text);
    expect(result).toEqual({ ok: false, reason: "parse_error" });
  });

  it("returns parse_error when species is missing", () => {
    const text = `{"identified": true, "type": "Raptor"}`;
    const result = parseIdentification(text);
    expect(result).toEqual({ ok: false, reason: "parse_error" });
  });

  it("parses multiline JSON inside a markdown code fence", () => {
    const text = `Here is my identification.\n\n\`\`\`json\n{\n  "identified": true,\n  "type": "Songbird",\n  "species": "Red-breasted Nuthatch"\n}\n\`\`\``;
    const result = parseIdentification(text);
    expect(result).toEqual({
      ok: true,
      value: {
        type: "Songbird",
        species: "Red-breasted Nuthatch",
        summary: "Here is my identification.",
      },
    });
  });

  it("returns not_identified when AI responds with identified false and no type/species", () => {
    const text = `I need more information. {"identified": false}`;
    const result = parseIdentification(text);
    expect(result).toEqual({ ok: false, reason: "not_identified" });
  });
});
