import { describe, it, expect } from "vitest";
import { PHOTO_READER_MESSAGES } from "@/hooks/usePhotoReader";

describe("usePhotoReader - PHOTO_READER_MESSAGES", () => {
  it("has the correct reading status message", () => {
    expect(PHOTO_READER_MESSAGES.READING).toBe("Reading photo...");
  });

  it("has the correct ready status message", () => {
    expect(PHOTO_READER_MESSAGES.READY).toBe("Photo ready.");
  });

  it("has the correct error message", () => {
    expect(PHOTO_READER_MESSAGES.ERROR).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
