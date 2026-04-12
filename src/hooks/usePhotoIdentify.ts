"use client";

import { useState } from "react";

export const PHOTO_IDENTIFY_MESSAGES = {
  IDENTIFYING: "Identifying bird from photo...",
  IDENTIFIED: "Bird identified from photo — fields populated.",
  FALLBACK: "Photo ready. Could not identify bird — please use the chat below.",
  ERROR: "Something went wrong. Please try again.",
} as const;

export function buildIdentifyPayload(base64: string): { photoBase64: string } {
  return { photoBase64: base64 };
}

export interface IdentifyResult {
  type: string;
  species: string;
  summary: string;
}

export interface UsePhotoIdentifyOptions {
  onIdentified: (result: IdentifyResult) => void;
  onFallback?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function usePhotoIdentify(options: UsePhotoIdentifyOptions): {
  identifying: boolean;
  identified: boolean;
  status: string;
  identify: (base64: string) => Promise<void>;
} {
  const [identifying, setIdentifying] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [status, setStatus] = useState("");

  async function identify(base64: string) {
    setIdentifying(true);
    setStatus(PHOTO_IDENTIFY_MESSAGES.IDENTIFYING);

    try {
      const res = await fetch("/api/identify-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildIdentifyPayload(base64)),
      });

      if (!res.ok) {
        const msg = PHOTO_IDENTIFY_MESSAGES.FALLBACK;
        setStatus(msg);
        if (options.onFallback) options.onFallback(msg);
        return;
      }

      const result = (await res.json()) as IdentifyResult;
      options.onIdentified(result);
      setIdentified(true);
      setStatus(PHOTO_IDENTIFY_MESSAGES.IDENTIFIED);
    } catch {
      const msg = PHOTO_IDENTIFY_MESSAGES.ERROR;
      setStatus("");
      if (options.onError) options.onError(msg);
    } finally {
      setIdentifying(false);
    }
  }

  return { identifying, identified, status, identify };
}
