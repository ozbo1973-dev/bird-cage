import { describe, it, expect } from "vitest";
import { parseIdentification } from "@/lib/chat";

describe("parseIdentification", () => {
  it("returns null when no JSON block present", () => {
    expect(parseIdentification("That looks like a sparrow!")).toBeNull();
  });

  it("parses a valid identification block", () => {
    const text = `Based on your description, I can identify this bird.
{"identified": true, "type": "Songbird", "species": "American Robin"}
It has a red breast and dark back.`;
    expect(parseIdentification(text)).toEqual({
      type: "Songbird",
      species: "American Robin",
    });
  });

  it("returns null when identified is false", () => {
    const text = `{"identified": false, "type": "Unknown", "species": "Unknown"}`;
    expect(parseIdentification(text)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    const text = `{"identified": true, "type": "Raptor" broken`;
    expect(parseIdentification(text)).toBeNull();
  });

  it("returns null when type is missing", () => {
    const text = `{"identified": true, "species": "Osprey"}`;
    expect(parseIdentification(text)).toBeNull();
  });

  it("returns null when species is missing", () => {
    const text = `{"identified": true, "type": "Raptor"}`;
    expect(parseIdentification(text)).toBeNull();
  });
});
