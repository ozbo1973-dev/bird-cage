import { describe, it, expect } from "vitest";
import { isFileTypeAccepted, isFileSizeAccepted } from "@/components/DragDropZone";

function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob(["x".repeat(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe("isFileTypeAccepted", () => {
  it("accepts image/jpeg for image/* accept string", () => {
    const file = makeFile("photo.jpg", "image/jpeg", 100);
    expect(isFileTypeAccepted(file, "image/*")).toBe(true);
  });

  it("accepts image/png for image/* accept string", () => {
    const file = makeFile("photo.png", "image/png", 100);
    expect(isFileTypeAccepted(file, "image/*")).toBe(true);
  });

  it("accepts image/webp for image/* accept string", () => {
    const file = makeFile("photo.webp", "image/webp", 100);
    expect(isFileTypeAccepted(file, "image/*")).toBe(true);
  });

  it("rejects text/plain for image/* accept string", () => {
    const file = makeFile("doc.txt", "text/plain", 100);
    expect(isFileTypeAccepted(file, "image/*")).toBe(false);
  });

  it("rejects application/pdf for image/* accept string", () => {
    const file = makeFile("doc.pdf", "application/pdf", 100);
    expect(isFileTypeAccepted(file, "image/*")).toBe(false);
  });

  it("accepts any file when accept is *", () => {
    const file = makeFile("anything.bin", "application/octet-stream", 100);
    expect(isFileTypeAccepted(file, "*")).toBe(true);
  });

  it("accepts any file when accept is empty string", () => {
    const file = makeFile("anything.bin", "application/octet-stream", 100);
    expect(isFileTypeAccepted(file, "")).toBe(true);
  });

  it("accepts exact mime type match", () => {
    const file = makeFile("photo.gif", "image/gif", 100);
    expect(isFileTypeAccepted(file, "image/gif")).toBe(true);
  });

  it("rejects non-matching exact mime type", () => {
    const file = makeFile("photo.png", "image/png", 100);
    expect(isFileTypeAccepted(file, "image/gif")).toBe(false);
  });

  it("accepts when accept is a comma-separated list and type matches one entry", () => {
    const file = makeFile("photo.png", "image/png", 100);
    expect(isFileTypeAccepted(file, "image/jpeg, image/png")).toBe(true);
  });
});

describe("isFileSizeAccepted", () => {
  const fiveMB = 5 * 1024 * 1024;

  it("accepts file exactly at the limit", () => {
    const file = makeFile("photo.jpg", "image/jpeg", fiveMB);
    expect(isFileSizeAccepted(file, fiveMB)).toBe(true);
  });

  it("accepts file smaller than the limit", () => {
    const file = makeFile("photo.jpg", "image/jpeg", 100);
    expect(isFileSizeAccepted(file, fiveMB)).toBe(true);
  });

  it("rejects file larger than the limit", () => {
    const file = makeFile("photo.jpg", "image/jpeg", fiveMB + 1);
    expect(isFileSizeAccepted(file, fiveMB)).toBe(false);
  });

  it("rejects zero-byte limit for any non-empty file", () => {
    const file = makeFile("photo.jpg", "image/jpeg", 1);
    expect(isFileSizeAccepted(file, 0)).toBe(false);
  });
});
