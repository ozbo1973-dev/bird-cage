import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  text: vi.fn(),
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  splitTextToSize: vi.fn((str: string) => [str]),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  line: vi.fn(),
  addPage: vi.fn(),
  getPageWidth: vi.fn().mockReturnValue(210),
  getPageHeight: vi.fn().mockReturnValue(297),
}));

vi.mock("jspdf", () => ({
  default: class JsPDFMock {
    save = mocks.save;
    text = mocks.text;
    setFontSize = mocks.setFontSize;
    setFont = mocks.setFont;
    splitTextToSize = mocks.splitTextToSize;
    setDrawColor = mocks.setDrawColor;
    setLineWidth = mocks.setLineWidth;
    line = mocks.line;
    addPage = mocks.addPage;
    internal = { pageSize: { getWidth: mocks.getPageWidth, getHeight: mocks.getPageHeight } };
  },
}));

import { buildChatFilename, generateChatPDF } from "@/components/DownloadChatButton";

beforeEach(() => vi.clearAllMocks());

describe("buildChatFilename", () => {
  it("returns birdy-chat prefix and .pdf suffix", () => {
    expect(buildChatFilename("My Chat")).toBe("birdy-chat-my-chat.pdf");
  });

  it("converts spaces to hyphens", () => {
    expect(buildChatFilename("Red Tailed Hawk")).toBe("birdy-chat-red-tailed-hawk.pdf");
  });

  it("strips special characters", () => {
    expect(buildChatFilename("Bird! Sighting?")).toBe("birdy-chat-bird-sighting.pdf");
  });

  it("preserves existing hyphens", () => {
    expect(buildChatFilename("Red-tailed Hawk")).toBe("birdy-chat-red-tailed-hawk.pdf");
  });

  it("collapses multiple hyphens into one", () => {
    expect(buildChatFilename("Bird!!!")).toBe("birdy-chat-bird.pdf");
  });

  it("trims leading and trailing hyphens", () => {
    expect(buildChatFilename("!Bird!")).toBe("birdy-chat-bird.pdf");
  });
});

describe("generateChatPDF", () => {
  const messages = [
    { id: 1, role: "user" as const, content: "What bird is this?" },
    { id: 2, role: "assistant" as const, content: "That looks like a Red-tailed Hawk." },
  ];

  it("saves the PDF with filename derived from title", () => {
    generateChatPDF("My Bird Chat", new Date("2026-01-15"), messages);

    expect(mocks.save).toHaveBeenCalledWith("birdy-chat-my-bird-chat.pdf");
  });

  it("writes the chat title into the PDF", () => {
    generateChatPDF("Hawk Spotting", new Date("2026-01-15"), messages);

    const allTextArgs = mocks.text.mock.calls.flatMap((call) =>
      Array.isArray(call[0]) ? (call[0] as string[]) : [call[0] as string],
    );
    expect(allTextArgs).toContain("Hawk Spotting");
  });

  it("writes user label 'You:' for user messages", () => {
    generateChatPDF("Chat", new Date(), messages);

    const allTextArgs = mocks.text.mock.calls.map((call) => call[0] as string);
    expect(allTextArgs).toContain("You:");
  });

  it("writes assistant label 'Birdy:' for assistant messages", () => {
    generateChatPDF("Chat", new Date(), messages);

    const allTextArgs = mocks.text.mock.calls.map((call) => call[0] as string);
    expect(allTextArgs).toContain("Birdy:");
  });

  it("uses splitTextToSize for each message content to handle long lines", () => {
    generateChatPDF("Chat", new Date(), messages);

    // 1 call for the title + 1 per message
    expect(mocks.splitTextToSize).toHaveBeenCalledTimes(messages.length + 1);
  });

  it("draws a horizontal divider line instead of text dashes", () => {
    generateChatPDF("Chat", new Date(), messages);

    expect(mocks.line).toHaveBeenCalledTimes(1);
  });

  it("uses generous margins to prevent right-margin cutoff", () => {
    generateChatPDF("Chat", new Date(), messages);

    // contentWidth = 210 - 20 (left) - 25 (right) = 165
    expect(mocks.splitTextToSize).toHaveBeenCalledWith(expect.any(String), 165);
  });

  it("wraps the title via splitTextToSize to prevent overflow", () => {
    generateChatPDF("A Very Long Title That Could Overflow The Right Margin", new Date(), messages);

    // first splitTextToSize call is for the title
    expect(mocks.splitTextToSize.mock.calls[0][1]).toBe(165);
  });
});
