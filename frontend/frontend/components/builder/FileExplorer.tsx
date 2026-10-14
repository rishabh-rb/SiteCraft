```tsx
"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCheck,
  CheckCircle2,
  Clipboard,
  LayoutTemplate,
  Loader2,
  MessageSquarePlus,
  Palette,
  RotateCcw,
  Sparkles,
  Type,
  User,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

import type { ChatMessage } from "@/lib/api";

interface ChatPanelProps {
  messages: ChatMessage[];
  chatText: string;
  setChatText: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  working: boolean;
  disabled: boolean;
}

interface Suggestion {
  label: string;
  description: string;
  text: string;
  icon: typeof Palette;
}

const MAX_MESSAGE_LENGTH = 1000;
const MIN_TEXTAREA_HEIGHT = 76;
const MAX_TEXTAREA_HEIGHT = 190;
const SCROLL_THRESHOLD = 100;
const COPY_FEEDBACK_DURATION = 1800;

const SUGGESTIONS: Suggestion[] = [
  {
    label: "Modern colors",
    description: "Create a cohesive color palette",
    text: "Improve the website's color palette with modern, harmonious, accessible colors. Maintain consistency across sections, buttons, cards, and interactive elements.",
    icon: Palette,
  },
  {
    label: "Add pricing",
    description: "Build professional pricing cards",
    text: "Add a responsive pricing section with polished pricing cards, clear feature comparisons, a highlighted recommended plan, subtle hover effects, and prominent call-to-action buttons.",
    icon: LayoutTemplate,
  },
  {
    label: "Better typography",
    description: "Improve readability and hierarchy",
    text: "Improve typography throughout the website with modern fonts, consistent font sizes, comfortable line heights, balanced spacing, and a clear visual hierarchy.",
    icon: Type,
  },
  {
    label: "Premium design",
    description: "Give the website a refined look",
    text: "Make the website feel more premium and professional with refined spacing, elegant cards, subtle shadows, consistent border radii, tasteful animations, and a cohesive visual design. Preserve existing functionality.",
    icon: Sparkles,
  },
  {
    label: "Mobile responsive",
    description: "Optimize every screen size",
    text: "Make the entire website responsive across mobile, tablet, laptop, and desktop screens. Fix overflowing elements, improve mobile navigation, and ensure buttons, cards, forms, and layouts adapt correctly.",
    icon: LayoutTemplate,
  },
  {
    label: "Improve buttons",
    description: "Polish interactive elements",
    text: "Improve buttons and interactive elements with consistent sizing, accessible contrast, clear hover and focus states, smooth transitions, and polished disabled states.",
    icon: Zap,
  },
];

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);

  try {
    textarea.select();

    if (!document.execCommand("copy")) {
      throw new Error("Unable to copy text");
    }
  } finally {
    textarea.remove();
  }
}

export function ChatPanel({
  messages,
  chatText,
  setChatText,
  onSubmit,
  working,
  disabled,
}: ChatPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const copyTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollFrameRef = useRef<number | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const previousMessageCountRef = useRef(messages.length);

  const inputId = useId();
  const helpId = useId();
  const countId = useId();
  const conversationId = useId();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyErrorId, setCopyErrorId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const canEdit = !disabled && !working;
  const trimmedText = chatText.trim();

  const remainingCharacters = MAX_MESSAGE_LENGTH - chatText.length;
  const characterProgress = Math.min(
    (chatText.length / MAX_MESSAGE_LENGTH) * 100,
    100,
  );

  const canSubmit =
    canEdit &&
    trimmedText.length > 0 &&
    chatText.length <= MAX_MESSAGE_LENGTH;

  const isNearLimit = remainingCharacters <= 120;
  const isAtLimit = remainingCharacters === 0;

  const clearCopyTimer = useCallback(() => {
    if (copyTimeoutRef.current !== null) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
  }, []);

  const cancelScrollFrame = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCopyTimer();
      cancelScrollFrame();
    };
  }, [clearCopyTimer, cancelScrollFrame]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = messagesContainerRef.current;

      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      }

      shouldAutoScrollRef.current = true;
      setShowScrollButton(false);
    },
    [],
  );

  const scheduleScrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      cancelScrollFrame();

      scrollFrameRef.current = requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        scrollToBottom(behavior);
      });
    },
    [cancelScrollFrame, scrollToBottom],
  );

  const updateScrollState = useCallback(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    const nearBottom = distanceFromBottom <= SCROLL_THRESHOLD;

    shouldAutoScrollRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
  }, []);

  // Follow new messages without forcing the user away from older messages.
  useEffect(() => {
    const hasNewMessages =
      messages.length !== previousMessageCountRef.current;

    previousMessageCountRef.current = messages.length;

    if (messages.length === 0) {
      shouldAutoScrollRef.current = true;
      setShowScrollButton(false);
      return;
    }

    if (shouldAutoScrollRef.current && hasNewMessages) {
      scheduleScrollToBottom("smooth");
    }
  }, [messages.length, scheduleScrollToBottom]);

  // Keep the latest assistant content visible during generation.
  useEffect(() => {
    if (!working || !shouldAutoScrollRef.current) return;

    scheduleScrollToBottom("auto");
  }, [working, messages, scheduleScrollToBottom]);

  // Reset conversation-specific UI when the conversation is cleared.
  useEffect(() => {
    if (messages.length !== 0) return;

    clearCopyTimer();
    setCopiedId(null);
    setCopyErrorId(null);
    setShowScrollButton(false);
    shouldAutoScrollRef.current = true;
    previousMessageCountRef.current = 0;
  }, [messages.length, clearCopyTimer]);

  // Automatically resize the input as the user types.
  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT),
      MAX_TEXTAREA_HEIGHT,
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_TEXTAREA_HEIGHT
        ? "auto"
        : "hidden";
  }, [chatText]);

  // Focus the input when the editor first becomes available.
  useEffect(() => {
    if (!canEdit || messages.length > 0) return;

    const frame = requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [canEdit, messages.length]);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = event.target.value;

    if (value.length <= MAX_MESSAGE_LENGTH) {
      setChatText(value);
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key !== "Enter" || event.shiftKey) return;

    // Do not submit while an IME composition is in progress.
    if (
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    ) {
      return;
    }

    event.preventDefault();

    if (canSubmit) {
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleClear = () => {
    if (!canEdit) return;

    setChatText("");
    focusInput();
  };

  const handleSuggestion = (text: string) => {
    if (!canEdit) return;

    setChatText(text.slice(0, MAX_MESSAGE_LENGTH));
    focusInput();
  };

  const handleCopy = async (id: string, content: string) => {
    clearCopyTimer();

    setCopiedId(null);
    setCopyErrorId(null);

    try {
      await copyText(content);

      setCopiedId(id);

      copyTimeoutRef.current = setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
        copyTimeoutRef.current = null;
      }, COPY_FEEDBACK_DURATION);
    } catch {
      setCopyErrorId(id);

      copyTimeoutRef.current = setTimeout(() => {
        setCopyErrorId((current) => (current === id ? null : current));
        copyTimeoutRef.current = null;
      }, COPY_FEEDBACK_DURATION);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!canSubmit) {
      event.preventDefault();
      return;
    }

    onSubmit(event);
  };

  return (
    <section
      className="space-y-5 border-t border-line pt-5"
      aria-label="Conversational website editor"
    >
      {/* Panel heading */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
              disabled
                ? "border-line bg-ink/[0.03]"
                : "border-teal/20 bg-teal/10 shadow-sm"
            }`}
          >
            <MessageSquarePlus
              className={`h-5 w-5 ${
                disabled ? "text-ink/35" : "text-teal"
              }`}
              aria-hidden="true"
            />

            {!disabled && (
              <span
                className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-paper ${
                  working
                    ? "animate-pulse bg-amber-400"
                    : "bg-emerald-500"
                }`}
                title={
                  working
                    ? "Changes in progress"
                    : "Editor available"
                }
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-ink sm:text-lg">
                Conversational Edits
              </h2>

              {!disabled && (
                <span className="inline-flex items-center gap-1 rounded-full border border-teal/15 bg-teal/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  AI Powered
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs leading-5 text-ink/50">
              Describe an idea. Let your website evolve.
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1.5"
            aria-label={`${messages.length} messages in conversation`}
            title={`${messages.length} messages`}
          >
            <CheckCircle2
              className="h-3.5 w-3.5 text-teal"
              aria-hidden="true"
            />
            <span className="text-[10px] font-bold tabular-nums text-ink/60">
              {messages.length}
            </span>
          </div>
        )}
      </div>

      {/* Conversation */}
      <div className="relative">
        <div
          id={conversationId}
          ref={messagesContainerRef}
          onScroll={updateScrollState}
          className="panel-scroll max-h-[420px] min-h-40 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-ink/[0.015] p-3 sm:p-4"
          aria-label="Edit conversation"
          aria-live="polite"
          aria-relevant="additions text"
          role="log"
          aria-busy={working}
        >
          {messages.length === 0 ? (
            <EmptyChatState />
          ) : (
            <div className="space-y-5">
              {messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  isUser={message.role === "user"}
                  isCopied={copiedId === message.id}
                  copyFailed={copyErrorId === message.id}
                  onCopy={handleCopy}
                />
              ))}

              {working && <ThinkingIndicator />}

              <div
                ref={messagesEndRef}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {showScrollButton && messages.length > 0 && (
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-2 text-[10px] font-bold text-ink shadow-lg transition-all hover:border-teal/30 hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
            aria-label="Scroll to latest message"
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            Latest message
          </button>
        )}
      </div>

      {/* Message composer */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div
          className={`group relative overflow-hidden rounded-2xl border bg-paper transition-all duration-200 ${
            canEdit
              ? "border-line shadow-sm focus-within:border-teal/50 focus-within:ring-4 focus-within:ring-teal/[0.07]"
              : "border-line opacity-70"
          }`}
        >
          {canEdit && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-teal transition-transform duration-300 group-focus-within:scale-x-100"
              aria-hidden="true"
            />
          )}

          <label htmlFor={inputId} className="sr-only">
            Describe your website edit
          </label>

          <textarea
            id={inputId}
            ref={textareaRef}
            value={chatText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? "Editing is currently unavailable..."
                : working
                  ? "Your changes are being applied..."
                  : "Describe what you want to improve..."
            }
            disabled={!canEdit}
            rows={3}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-describedby={`${helpId} ${countId}`}
            className="block min-h-[76px] w-full resize-none overflow-y-auto bg-transparent px-4 pb-14 pt-4 text-sm leading-6 text-ink outline-none placeholder:text-ink/35 disabled:cursor-not-allowed"
          />

          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {chatText.length > 0 && canEdit ? (
                <>
                  <div
                    className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-ink/[0.06]"
                    role="progressbar"
                    aria-label="Message character limit"
                    aria-valuemin={0}
                    aria-valuemax={MAX_MESSAGE_LENGTH}
                    aria-valuenow={chatText.length}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        isNearLimit ? "bg-orange-500" : "bg-teal"
                      }`}
                      style={{ width: `${characterProgress}%` }}
                    />
                  </div>

                  <span
                    id={countId}
                    className={`whitespace-nowrap text-[10px] font-medium tabular-nums ${
                      isAtLimit
                        ? "text-red-500"
                        : isNearLimit
                          ? "text-orange-500"
                          : "text-ink/45"
                    }`}
                  >
                    {remainingCharacters} left
                  </span>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink/45 transition-colors hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
                    aria-label="Clear message"
                    title="Clear message"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </>
              ) : working ? (
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-teal"
                  role="status"
                >
                  <Loader2
                    className="h-3 w-3 animate-spin"
                    aria-hidden="true"
                  />
                  Working on your design...
                </span>
              ) : !disabled ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-ink/40">
                  <Sparkles
                    className="h-3 w-3 text-teal"
                    aria-hidden="true"
                  />
                  Ready for your next idea
                </span>
              ) : (
                <span
                  id={countId}
                  className="text-[10px] text-ink/40"
                >
                  Editor unavailable
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-2 ${
                canSubmit
                  ? "bg-ink text-white shadow-sm hover:-translate-y-0.5 hover:bg-black hover:shadow-md active:translate-y-0"
                  : "cursor-not-allowed bg-ink/[0.06] text-ink/30"
              }`}
              aria-label={working ? "Applying changes" : "Apply edit"}
              title={canSubmit ? "Apply edit" : "Enter a message first"}
            >
              {working ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Input guidance */}
        {canEdit && (
          <div
            id={helpId}
            className="flex flex-wrap items-center justify-between gap-2 px-1"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] leading-4 text-ink/45">
              <Sparkles
                className="h-3 w-3 shrink-0 text-teal"
                aria-hidden="true"
              />
              Be specific for better results.
            </span>

            <div className="hidden items-center gap-1 text-[10px] text-ink/40 sm:flex">
              <kbd className="rounded border border-line bg-paper px-1.5 py-0.5">
                Enter
              </kbd>
              <span>to apply</span>
              <span className="mx-1">·</span>
              <kbd className="rounded border border-line bg-paper px-1.5 py-0.5">
                Shift
              </kbd>
              <span>+</span>
              <kbd className="rounded border border-line bg-paper px-1.5 py-0.5">
                Enter
              </kbd>
              <span>for a new line</span>
            </div>
          </div>
        )}

        {/* Quick suggestions */}
        {!trimmedText && canEdit && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5">
                <WandSparkles
                  className="h-3.5 w-3.5 text-teal"
                  aria-hidden="true"
                />
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink/55">
                  Quick edits
                </h3>
              </div>

              <span className="text-[10px] text-ink/35">
                Start with an idea
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {SUGGESTIONS.map((suggestion) => {
                const Icon = suggestion.icon;

                return (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => handleSuggestion(suggestion.text)}
                    className="group flex min-w-0 items-center gap-3 rounded-xl border border-line bg-paper p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/30 hover:bg-teal/[0.035] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30 active:translate-y-0"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal/10 bg-teal/[0.08] text-teal transition-transform duration-200 group-hover:scale-105">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-ink/80 transition-colors group-hover:text-teal">
                        {suggestion.label}
                      </span>

                      <span className="mt-1 block text-[10px] leading-4 text-ink/50">
                        {suggestion.description}
                      </span>
                    </span>

                    <ArrowUp
                      className="h-3.5 w-3.5 shrink-0 -rotate-45 text-ink/25 transition-all group-hover:translate-x-0.5 group-hover:text-teal"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {disabled && (
          <div
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-ink/[0.025] px-3 py-3"
            role="status"
          >
            <span className="h-2 w-2 rounded-full bg-ink/25" />
            <p className="text-xs font-medium text-ink/50">
              Website editing is currently unavailable.
            </p>
          </div>
        )}
      </form>
    </section>
  );
}

function EmptyChatState() {
  return (
    <div className="relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-xl px-5 py-8 text-center">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal/[0.07] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal/15 bg-teal/10 shadow-sm">
          <WandSparkles
            className="h-6 w-6 text-teal"
            aria-hidden="true"
          />
        </div>

        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-paper bg-emerald-500 text-white"
          aria-hidden="true"
        >
          <Check className="h-3 w-3" />
        </span>
      </div>

      <h3 className="relative text-sm font-extrabold tracking-tight text-ink/85">
        Your AI design assistant is ready
      </h3>

      <p className="relative mt-2 max-w-xs text-xs leading-5 text-ink/50">
        Transform your website using natural language. Improve
        layouts, colors, typography, content, spacing, and entire
        sections.
      </p>

      <div className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-teal/15 bg-teal/[0.06] px-3 py-1.5">
        <Zap className="h-3.5 w-3.5 text-teal" aria-hidden="true" />
        <span className="text-[10px] font-bold text-teal">
          Your next idea starts here
        </span>
      </div>

      <div className="relative mt-5 flex flex-wrap justify-center gap-2">
        {["Change colors", "Add a section", "Improve layout"].map(
          (idea) => (
            <span
              key={idea}
              className="rounded-full border border-line bg-paper/80 px-2.5 py-1 text-[10px] font-medium text-ink/50"
            >
              {idea}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  isUser,
  isCopied,
  copyFailed,
  onCopy,
}: {
  message: ChatMessage;
  isUser: boolean;
  isCopied: boolean;
  copyFailed: boolean;
  onCopy: (id: string, content: string) => void;
}) {
  return (
    <div
      className={`group flex items-start gap-2.5 sm:gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
          isUser
            ? "border-accent/15 bg-accent/10 text-accent"
            : "border-teal/15 bg-teal/10 text-teal"
        }`}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      <div
        className={`flex min-w-0 max-w-[88%] flex-col sm:max-w-[82%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`min-w-0 rounded-2xl border px-3.5 py-3 shadow-sm transition-shadow group-hover:shadow-md sm:px-4 ${
            isUser
              ? "rounded-tr-md border-accent/15 bg-accent/[0.06]"
              : "rounded-tl-md border-line bg-paper"
          }`}
        >
          <div
            className={`mb-2 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] ${
              isUser ? "text-accent" : "text-teal"
            }`}
          >
            {isUser ? (
              <>
                <User className="h-3 w-3" aria-hidden="true" />
                You
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                AI Assistant
              </>
            )}
          </div>

          <p className="whitespace-pre-wrap break-words text-xs leading-5 text-ink sm:text-[13px] sm:leading-6">
            {message.content}
          </p>
        </div>

        {!isUser && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => onCopy(message.id, message.content)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold text-ink/45 transition-colors hover:bg-ink/[0.04] hover:text-ink/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
              aria-label={
                isCopied
                  ? "Message copied"
                  : copyFailed
                    ? "Copy failed, try again"
                    : "Copy AI response"
              }
            >
              {isCopied ? (
                <>
                  <CheckCheck
                    className="h-3.5 w-3.5 text-emerald-500"
                    aria-hidden="true"
                  />
                  Copied
                </>
              ) : copyFailed ? (
                <>
                  <RotateCcw
                    className="h-3.5 w-3.5 text-red-500"
                    aria-hidden="true"
                  />
                  Try again
                </>
              ) : (
                <>
                  <Clipboard
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  Copy response
                </>
              )}
            </button>

            {copyFailed && (
              <span className="text-[10px] text-red-500" role="status">
                Clipboard unavailable
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div
      className="flex items-start gap-2.5 sm:gap-3"
      role="status"
      aria-label="AI is applying website changes"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-teal/15 bg-teal/10">
        <Sparkles
          className="h-4 w-4 animate-pulse text-teal"
          aria-hidden="true"
        />
      </div>

      <div className="rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal" />

          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal"
            style={{ animationDelay: "120ms" }}
          />

          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal"
            style={{ animationDelay: "240ms" }}
          />

          <span className="ml-1.5 text-[10px] font-semibold text-ink/50">
            Working on your design...
          </span>

          <Loader2
            className="ml-1 h-3 w-3 animate-spin text-teal/60"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
```