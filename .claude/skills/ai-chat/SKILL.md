---
name: ai-chat
description: >
  Build a TypeScript AI chat interface with a rich text editor. Use this skill whenever the user wants
  to create, scaffold, or add a chat UI powered by an LLM — including prompts like "add an AI chat",
  "build a chatbot interface", "integrate Claude into my app", "create a chat component", or "set up
  streaming AI responses". Covers Tiptap rich text editor integration, OpenRouter streaming via the
  Anthropic SDK, Next.js API routes, and full conversation history management. Trigger this skill even
  if the user just mentions "chat" alongside "AI", "Claude", "LLM", or "streaming".
---

# AI Chat with Rich Text Editor

A complete implementation guide for a streaming AI chat interface using:
- **Tiptap** — rich text editor for user input
- **OpenRouter** — model-agnostic LLM access via the Anthropic SDK (default: `openai/gpt-oss-120b` with Cerebras inference)
- **Next.js** — App Router with a server-side API route for the AI call
- **TypeScript** — strict types throughout

## Model Configuration

The API route uses OpenRouter via the Anthropic SDK's `baseURL` + `defaultHeaders` pattern. The default model is `openrouter/openai/gpt-oss-120b`. The model is read from an env var so it can be swapped without code changes.

```env
# .env.local
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openrouter/openai/gpt-oss-120b   # optional override
```

---

## Architecture

```
app/
├── api/
│   └── chat/
│       └── route.ts        ← Server: streams Claude responses
├── chat/
│   └── page.tsx            ← Client: chat page
components/
├── chat/
│   ├── ChatWindow.tsx      ← Orchestrates messages + input
│   ├── MessageList.tsx     ← Renders conversation history
│   └── ChatInput.tsx       ← Tiptap editor + send button
types/
└── chat.ts                 ← Shared types
```

---

## Step 1: Install dependencies

```bash
pnpm add @anthropic-ai/sdk @tiptap/react @tiptap/pm @tiptap/starter-kit
```

> The Anthropic SDK is used here to talk to OpenRouter (not Anthropic directly). OpenRouter exposes an Anthropic-compatible API, so we reuse the same SDK with a different `baseURL` and API key.

---

## Step 2: Types

```typescript
// types/chat.ts
export type Role = 'user' | 'assistant'

export interface Message {
  id: string
  role: Role
  content: string       // plain text for user; accumulated text for assistant
  isStreaming?: boolean  // true while assistant is still receiving tokens
}
```

---

## Step 3: API Route (server)

The API route receives the conversation history and streams back the assistant reply. It uses OpenRouter via the Anthropic SDK's `baseURL` override — this lets you swap models by changing one env var.

```typescript
// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import type { Role } from '@/types/chat'

const DEFAULT_MODEL = 'openrouter/openai/gpt-oss-120b'

const client = new Anthropic({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    'X-Title': process.env.NEXT_PUBLIC_APP_NAME ?? 'AI Chat',
  },
})

export async function POST(req: NextRequest) {
  const { messages, model } = await req.json() as {
    messages: { role: Role; content: string }[]
    model?: string
  }

  const selectedModel = model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // Stream in the background — do not await
  ;(async () => {
    try {
      const stream = client.messages.stream({
        model: selectedModel,
        max_tokens: 1024,
        messages,
      })

      stream.on('text', async (text) => {
        await writer.write(encoder.encode(text))
      })

      await stream.finalMessage()
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
```

**Model swapping:** Pass `model` in the request body from the client, or set `OPENROUTER_MODEL` in env. The default is `openrouter/openai/gpt-oss-120b` (Cerebras inference). Any OpenRouter model ID works — e.g. `anthropic/claude-opus-4`, `meta-llama/llama-3.3-70b-instruct`.

**Why a streaming route?** Streaming gives the user visible progress on long responses. The `TransformStream` bridges the Anthropic SDK stream to the browser's `ReadableStream`.

---

## Step 4: ChatInput component (Tiptap)

```tsx
// components/chat/ChatInput.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false, // required for Next.js SSR
    editorProps: {
      attributes: { class: 'min-h-[80px] p-3 outline-none' },
      handleKeyDown(_, event) {
        // Send on Enter (without Shift)
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          handleSend()
          return true
        }
        return false
      },
    },
  })

  function handleSend() {
    if (!editor || disabled) return
    const text = editor.getText({ blockSeparator: '\n\n' }).trim()
    if (!text) return
    onSend(text)
    editor.commands.clearContent()
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <EditorContent editor={editor} />
      <div className="flex justify-end p-2 border-t">
        <button
          onClick={handleSend}
          disabled={disabled}
          className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
```

**Notes on Tiptap:**
- `immediatelyRender: false` prevents SSR hydration mismatches in Next.js
- `editor.getText({ blockSeparator: '\n\n' })` preserves paragraph breaks as plain text
- `StarterKit` includes bold, italic, lists, headings, code blocks out of the box
- Clear the editor after send with `editor.commands.clearContent()`

---

## Step 5: MessageList component

```tsx
// components/chat/MessageList.tsx
import type { Message } from '@/types/chat'

export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto flex-1 p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`max-w-[75%] rounded-lg p-3 whitespace-pre-wrap ${
            msg.role === 'user'
              ? 'self-end bg-blue-100'
              : 'self-start bg-gray-100'
          }`}
        >
          {msg.content}
          {msg.isStreaming && <span className="animate-pulse ml-1">▌</span>}
        </div>
      ))}
    </div>
  )
}
```

---

## Step 6: ChatWindow (orchestrator)

This is the core state machine: it holds the message list, calls the API route, and accumulates streamed tokens into the assistant message.

```tsx
// components/chat/ChatWindow.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import type { Message } from '@/types/chat'

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(userText: string) {
    const userMsg: Message = { id: nanoid(), role: 'user', content: userText }

    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)

    const assistantId = nanoid()
    // Optimistically add an empty assistant message that we'll stream into
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        // Append each chunk to the streaming assistant message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + chunk }
              : m
          )
        )
      }
    } finally {
      // Mark streaming done
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      )
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-[80vh] border rounded-xl overflow-hidden">
      <MessageList messages={messages} />
      <div ref={bottomRef} />
      <div className="p-4 border-t">
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  )
}
```

**Key patterns:**
- Add the assistant message optimistically before the stream starts so the UI responds immediately
- Accumulate chunks by mapping over messages using a stable `id` — avoids race conditions
- `disabled={isStreaming}` prevents double-sends while a response is in flight
- `useEffect` for scroll-to-bottom is appropriate here — it's a DOM side effect with no alternatives

---

## Step 7: Wire up the page

```tsx
// app/chat/page.tsx
import { ChatWindow } from '@/components/chat/ChatWindow'

export default function ChatPage() {
  return (
    <main className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">AI Chat</h1>
      <ChatWindow />
    </main>
  )
}
```

---

## Environment variables

Add to `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openrouter/openai/gpt-oss-120b   # default; override to swap models
NEXT_PUBLIC_APP_URL=http://localhost:3000          # sent as HTTP-Referer to OpenRouter
NEXT_PUBLIC_APP_NAME=AI Chat                       # sent as X-Title to OpenRouter
```

To swap to a different model at runtime, either:
- Change `OPENROUTER_MODEL` in env and restart
- Pass `model: 'some/other-model'` in the POST body from the client

---

## Optional: Tiptap toolbar

If you want formatting buttons (bold, italic, etc.) above the editor:

```tsx
function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null
  return (
    <div className="flex gap-2 p-2 border-b">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'font-bold underline' : ''}
      >B</button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'italic underline' : ''}
      >I</button>
    </div>
  )
}
```

Place `<Toolbar editor={editor} />` inside `ChatInput` above `<EditorContent />`.

---

## Common pitfalls

| Problem | Fix |
|---|---|
| SSR hydration mismatch with Tiptap | Add `immediatelyRender: false` to `useEditor` |
| Two consecutive same-role messages | Always alternate user/assistant — enforce in `handleSend` |
| Editor not clearing after send | Call `editor.commands.clearContent()` |
| Stream never ends | Ensure `writer.close()` is in a `finally` block |
| API key exposed to client | Keep `OPENROUTER_API_KEY` server-side only — never prefix with `NEXT_PUBLIC_` |
