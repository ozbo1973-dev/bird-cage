"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getTitlePreFill } from "@/lib/birdyChatUtils";
import type { BillingPlan } from "@/lib/billing";
import styles from "./BirdyChatPage.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  billingPlan: BillingPlan;
  isAdmin: boolean;
}

export default function BirdyChatPage({ billingPlan, isAdmin }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Save flow
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedChatId, setSavedChatId] = useState<number | null>(null);
  const [sessionLocked, setSessionLocked] = useState(false);

  // New chat warning
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasExchange = messages.some((m) => m.role === "user") && messages.some((m) => m.role === "assistant");
  const hasUnsavedMessages = messages.length > 0 && !sessionLocked;

  async function send() {
    const text = input.trim();
    if (!text || isStreaming || sessionLocked) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/birdy-chat", {
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
        accumulated += decoder.decode(value);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: message };
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

  function openSaveDialog() {
    const firstUserMessage = messages.find((m) => m.role === "user")?.content;
    setSaveTitle(getTitlePreFill(firstUserMessage));
    setShowSaveDialog(true);
  }

  async function handleSave() {
    if (!saveTitle.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/birdy-chat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: saveTitle.trim(),
          messages: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Save failed (${res.status})`);
      }
      const data = (await res.json()) as { chatId: number };
      setSavedChatId(data.chatId);
      setSessionLocked(true);
      setShowSaveDialog(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleStartNewChat() {
    if (hasUnsavedMessages) {
      setShowNewChatConfirm(true);
    } else {
      clearChat();
    }
  }

  function clearChat() {
    setMessages([]);
    setInput("");
    setSessionLocked(false);
    setSavedChatId(null);
    setShowSaveDialog(false);
    setShowNewChatConfirm(false);
  }

  const isPro = isAdmin || billingPlan === "paid";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.back}>
          ← Dashboard
        </Link>
        <h1 className={styles.title}>Birdy Chat</h1>
        <div className={styles.headerRight}>
          <span className={isPro ? styles.proBadge : styles.freeBadge}>
            {isPro ? "Pro" : "Free"} model
          </span>
          <Link href="/birdy-chat/discussions" className={styles.viewDiscussions}>
            View Saved Discussions
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.chatContainer}>
          <div className={styles.messages}>
            {messages.length === 0 && (
              <p className={styles.placeholder}>
                Ask Birdy anything about birds — identification, behavior, habitats, equipment, and more.
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
            <div ref={messagesEndRef} />
          </div>

          {savedChatId !== null && (
            <div className={styles.savedBanner}>
              Discussion saved.{" "}
              <Link href={`/birdy-chat/discussions/${savedChatId}`} className={styles.savedLink}>
                View saved discussion
              </Link>
            </div>
          )}

          <div className={styles.inputArea}>
            {sessionLocked ? (
              <button type="button" className={styles.newChatBtn} onClick={handleStartNewChat}>
                Start New Chat
              </button>
            ) : (
              <>
                <div className={styles.inputRow}>
                  <textarea
                    className={styles.input}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Birdy about birds..."
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
                <div className={styles.actions}>
                  {hasExchange && !sessionLocked && (
                    <button type="button" className={styles.saveBtn} onClick={openSaveDialog}>
                      Save Discussion
                    </button>
                  )}
                  {messages.length > 0 && (
                    <button type="button" className={styles.newChatBtnSmall} onClick={handleStartNewChat}>
                      Start New Chat
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {showSaveDialog && (
          <div className={styles.saveDialogBackdrop} onClick={() => setShowSaveDialog(false)}>
            <div className={styles.saveDialog} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.saveDialogTitle}>Save Discussion</h2>
              <label className={styles.saveLabel} htmlFor="save-title">
                Title
              </label>
              <input
                id="save-title"
                type="text"
                className={styles.saveInput}
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                maxLength={120}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setShowSaveDialog(false);
                }}
              />
              <div className={styles.saveDialogActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.confirmSaveBtn}
                  onClick={handleSave}
                  disabled={isSaving || !saveTitle.trim()}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={showNewChatConfirm}
          message="You have unsaved messages. Start a new chat anyway?"
          confirmLabel="Start New Chat"
          onConfirm={clearChat}
          onCancel={() => setShowNewChatConfirm(false)}
        />
      </main>
    </div>
  );
}
