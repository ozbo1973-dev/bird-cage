"use client";

import { useState } from "react";

export const PHOTO_READER_MESSAGES = {
  READING: "Reading photo...",
  READY: "Photo ready.",
  ERROR: "Something went wrong. Please try again.",
} as const;

export interface UsePhotoReaderOptions {
  onBase64Ready: (base64: string) => void | Promise<void>;
  onPreviewReady?: (objectUrl: string) => void;
  onError?: (msg: string) => void;
}

export function usePhotoReader(options: UsePhotoReaderOptions): {
  reading: boolean;
  error: string;
  readFile: (file: File) => Promise<void>;
} {
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  async function readFile(file: File) {
    setError("");
    setReading(true);

    if (options.onPreviewReady) {
      options.onPreviewReady(URL.createObjectURL(file));
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await options.onBase64Ready(base64);
    } catch {
      const msg = PHOTO_READER_MESSAGES.ERROR;
      setError(msg);
      if (options.onError) options.onError(msg);
    } finally {
      setReading(false);
    }
  }

  return { reading, error, readFile };
}
