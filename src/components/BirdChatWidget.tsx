"use client";

import { useState } from "react";
import styles from "./BirdChatWidget.module.css";
import { parseIdentification } from "@/lib/chat";
import type { BirdIdentification } from "@/lib/chat";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  onIdentified: (result: BirdIdentification) => void;
}

export default function BirdChatWidget({ onIdentified }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [identified, setIdentified] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsStreaming(true);

    // Placeholder for streaming assistant reply
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        accumulated += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      }

      const result = parseIdentification(accumulated);
      if (result.ok && !identified) {
        setIdentified(true);
        onIdentified(result.value);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: message,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>AI Bird Identification</div>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.placeholder}>
            Describe the bird you saw and the AI will identify its type and species.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.role === "user" ? styles.userMsg : styles.assistantMsg}
          >
            {msg.content}
            {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
              <span className={styles.cursor} />
            )}
          </div>
        ))}
      </div>
      {identified ? (
        <p className={styles.identified}>Bird identified — fields updated above.</p>
      ) : (
        <div className={styles.inputRow}>
          <textarea
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Small brown bird with a red breast..."
            rows={2}
            disabled={isStreaming}
          />
          <button
            type="button"
            onClick={send}
            disabled={isStreaming || !input.trim()}
            className={styles.sendBtn}
          >
            {isStreaming ? "..." : "Send"}
          </button>
        </div>
      )}
    </div>
  );
}
