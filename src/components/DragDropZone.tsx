"use client";

import { useState } from "react";
import styles from "./DragDropZone.module.css";

interface Props {
  onFile: (file: File) => void;
  onError?: (message: string) => void;
  accept?: string;
  maxSizeBytes?: number;
  disabled?: boolean;
  children: React.ReactNode;
}

export function isFileTypeAccepted(file: File, accept: string): boolean {
  if (!accept || accept === "*") return true;
  const types = accept.split(",").map((t) => t.trim());
  return types.some((t) => {
    if (t.endsWith("/*")) {
      const category = t.split("/")[0];
      return file.type.startsWith(category + "/");
    }
    return file.type === t;
  });
}

export function isFileSizeAccepted(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

export default function DragDropZone({
  onFile,
  onError,
  accept = "image/*",
  maxSizeBytes = 5 * 1024 * 1024,
  disabled,
  children,
}: Props) {
  const [dragging, setDragging] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];

    if (!isFileTypeAccepted(file, accept)) {
      onError?.("Invalid file type. Please upload an image.");
      return;
    }

    if (!isFileSizeAccepted(file, maxSizeBytes)) {
      onError?.(
        `File too large. Maximum size is ${Math.round(maxSizeBytes / 1024 / 1024)}MB.`,
      );
      return;
    }

    onFile(file);
  }

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ""} ${disabled ? styles.disabled : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {children}
      {dragging && <div className={styles.overlay}>Drop photo here</div>}
    </div>
  );
}
