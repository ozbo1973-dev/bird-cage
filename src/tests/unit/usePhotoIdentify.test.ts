import { describe, it, expect } from "vitest";
import {
  PHOTO_IDENTIFY_MESSAGES,
  buildIdentifyPayload,
} from "@/hooks/usePhotoIdentify";

describe("usePhotoIdentify - PHOTO_IDENTIFY_MESSAGES", () => {
  it("has the correct identifying status message", () => {
    expect(PHOTO_IDENTIFY_MESSAGES.IDENTIFYING).toBe(
      "Identifying bird from photo...",
    );
  });

  it("has the correct identified status message", () => {
    expect(PHOTO_IDENTIFY_MESSAGES.IDENTIFIED).toBe(
      "Bird identified from photo — fields populated.",
    );
  });

  it("has the correct fallback status message when identification fails", () => {
    expect(PHOTO_IDENTIFY_MESSAGES.FALLBACK).toBe(
      "Photo ready. Could not identify bird — please use the chat below.",
    );
  });

  it("has the correct error message", () => {
    expect(PHOTO_IDENTIFY_MESSAGES.ERROR).toBe(
      "Something went wrong. Please try again.",
    );
  });
});

describe("usePhotoIdentify - buildIdentifyPayload", () => {
  it("wraps base64 string in photoBase64 field", () => {
    const payload = buildIdentifyPayload("data:image/jpeg;base64,abc123");
    expect(payload).toEqual({ photoBase64: "data:image/jpeg;base64,abc123" });
  });

  it("handles empty string", () => {
    const payload = buildIdentifyPayload("");
    expect(payload).toEqual({ photoBase64: "" });
  });
});
