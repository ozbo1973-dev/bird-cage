"use client";

import jsPDF from "jspdf";
import { Download } from "lucide-react";
import styles from "./DownloadChatButton.module.css";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  title: string;
  date: Date | number;
  messages: ChatMessage[];
}

export function buildChatFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `birdy-chat-${slug}.pdf`;
}

export function generateChatPDF(
  title: string,
  date: Date | number,
  messages: ChatMessage[],
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 20;
  const rightMargin = 25;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  let y = 20;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, leftMargin, y);
  y += titleLines.length * 8;

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const dateStr = new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(dateStr, leftMargin, y);
  y += 10;

  // Divider line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, y, pageWidth - rightMargin, y);
  y += 8;

  // Messages
  for (const message of messages) {
    const label = message.role === "user" ? "You:" : "Birdy:";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, leftMargin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(message.content, contentWidth);
    for (const line of lines) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, leftMargin, y);
      y += 5;
    }
    y += 4;
  }

  doc.save(buildChatFilename(title));
}

export default function DownloadChatButton({ title, date, messages }: Props) {
  return (
    <button
      type="button"
      className={styles.downloadBtn}
      onClick={() => generateChatPDF(title, date, messages)}
    >
      <Download size={16} />
      Download PDF
    </button>
  );
}
