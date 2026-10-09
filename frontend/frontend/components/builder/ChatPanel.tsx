
"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Clipboard,
  LayoutTemplate,
  Loader2,
  MessageSquarePlus,
  Palette,
  Sparkles,
  Type,
  User,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/api";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_MESSAGE_LENGTH = 1000;
const MIN_TEXTAREA_HEIGHT = 76;
const MAX_TEXTAREA_HEIGHT = 190;
const SCROLL_THRESHOLD = 80;
const COPY_FEEDBACK_DURATION = 1600;

const suggestions: Suggestion[] = [
  {
    label: "Modern colors",
    description: "Refresh your color palette",
    text: "Make the website color palette more modern, balanced, accessible, and visually appealing. Keep the design consistent across all sections.",
    icon: Palette,
  },
  {
    label: "Add pricing",
    description: "Create beautiful pricing cards",
    text: "Add a clean, modern, responsive pricing section with attractive pricing cards, clear feature comparisons, and a prominent call-to-action.",
    icon: LayoutTemplate,
  },
  {
    label: "Better typography",
    description: "Improve fonts and spacing",
    text: "Improve the website typography with a modern sans-serif font, consistent font sizes, better line heights, balanced spacing, and a clear visual hierarchy.",
    icon: Type,
  },
];

/* =========================================================
   MAIN COMPONENT
========================================================= */

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
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const canEdit = !disabled && !working;
  const trimmedText = chatText.trim();

  const canSubmit =
    canEdit &&
    trimmedText.length > 0 &&
    chatText.length <= MAX_MESSAGE_LENGTH;

  const remainingCharacters = MAX_MESSAGE_LENGTH - chatText.length;

  const isNearLimit =
    remainingCharacters <= 120 && remainingCharacters > 0;

  const isAtLimit = remainingCharacters <= 0;

  /* =========================================================
     AUTO SCROLL
  ========================================================= */

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({
      behavior,
      block: "end",
    });

    setUserHasScrolled(false);
    setShowScrollButton(false);
  }, []);

  useEffect(() => {
    if (!userHasScrolled) {
      scrollToBottom("smooth");
    }
  }, [messages.length, working, userHasScrolled, scrollToBottom]);

  /* =========================================================
     DETECT MANUAL SCROLL
  ========================================================= */

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    const isAwayFromBottom = distanceFromBottom > SCROLL_THRESHOLD;

    setUserHasScrolled(isAwayFromBottom);
    setShowScrollButton(isAwayFromBottom);
  }, []);

  /* =========================================================
     AUTO-RESIZE TEXTAREA
  ========================================================= */

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT),
      MAX_TEXTAREA_HEIGHT
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [chatText]);

  /* =========================================================
     INITIAL FOCUS
  ========================================================= */

  useEffect(() => {
    if (!canEdit || messages.length > 0) return;

    const frameId = requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });

    return () => cancelAnimationFrame(frameId);
  }, [canEdit, messages.length]);

  /* =========================================================
     RESET CONVERSATION STATE
  ========================================================= */

  useEffect(() => {
    if (messages.length === 0) {
      setUserHasScrolled(false);
      setShowScrollButton(false);
      setCopiedId(null);
    }
  }, [messages.length]);

  /* =========================================================
     CLEANUP TIMERS
  ========================================================= */

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  /* =========================================================
     KEYBOARD HANDLING
  ========================================================= */

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key !== "Enter" || event.shiftKey) return;

    // Preserve normal IME composition behavior.
    if (event.nativeEvent.isComposing) return;

    event.preventDefault();

    if (!canSubmit) return;

    event.currentTarget.form?.requestSubmit();
  };

  /* =========================================================
     INPUT CHANGE
  ========================================================= */

  const handleChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;

    if (value.length <= MAX_MESSAGE_LENGTH) {
      setChatText(value);
    }
  };

  /* =========================================================
     FOCUS INPUT
  ========================================================= */

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  /* =========================================================
     CLEAR INPUT
  ========================================================= */

  const handleClear = () => {
    setChatText("");
    focusInput();
  };

  /* =========================================================
     QUICK SUGGESTIONS
  ========================================================= */

  const handleSuggestion = (text: string) => {
    if (!canEdit) return;

    setChatText(text);
    focusInput();
  };

  /* =========================================================
     COPY AI MESSAGE
  ========================================================= */

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);

      setCopiedId(id);

      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
        copyTimeoutRef.current = null;
      }, COPY_FEEDBACK_DURATION);
    } catch {
      setCopiedId(null);
    }
  };

  /* =========================================================
     SUBMIT FORM
  ========================================================= */

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!canSubmit) {
      event.preventDefault();
      return;
    }

    // Let the existing parent handler process the submission.
    onSubmit(event);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section
      className="space-y-4 border-t border-line pt-5"
      aria-label="Conversational website editor"
    >
      {/* HEADER */}

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
              disabled
                ? "border-line bg-ink/[0.03]"
                : "border-teal/15 bg-teal/10 shadow-sm"
            }`}
          >
            <MessageSquarePlus
              className={`h-5 w-5 ${
                disabled ? "text-ink/30" : "text-teal"
              }`}
            />

            {!disabled && (
              <span
                className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-paper bg-emerald-500"
                aria-label="Editor available"
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
                  <Sparkles className="h-3 w-3" />
                  AI Powered
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-ink/50">
              Describe a change and let your design evolve.
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1.5"
            title={`${messages.length} conversation messages`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-teal" />

            <span className="text-[10px] font-bold text-ink/60">
              {messages.length}
            </span>
          </div>
        )}
      </div>

      {/* CHAT HISTORY */}

      <div className="relative">
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="panel-scroll max-h-96 min-h-40 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-ink/[0.015] p-3 sm:p-4"
          aria-label="Edit conversation"
          aria-live="polite"
          aria-relevant="additions text"
          role="log"
        >
          {messages.length === 0 ? (
            <EmptyChatState />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  isUser={message.role === "user"}
                  isCopied={copiedId === message.id}
                  onCopy={handleCopy}
                />
              ))}

              {working && <ThinkingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* JUMP TO LATEST MESSAGE */}

        {showScrollButton && (
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-2 text-[10px] font-bold text-ink shadow-lg transition hover:border-teal/30 hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
            aria-label="Scroll to latest message"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Latest
          </button>
        )}
      </div>

      {/* COMPOSER */}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div
          className={`group relative overflow-hidden rounded-2xl border bg-paper transition-all duration-200 ${
            canEdit
              ? "border-line shadow-sm focus-within:border-teal/50 focus-within:ring-4 focus-within:ring-teal/[0.07]"
              : "border-line opacity-70"
          }`}
        >
          {/* Focus accent */}

          {canEdit && (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-teal transition-transform duration-300 group-focus-within:scale-x-100" />
          )}

          <label htmlFor="website-edit-input" className="sr-only">
            Describe your website edit
          </label>

          <textarea
            id="website-edit-input"
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
            aria-describedby="chat-input-help chat-character-count"
            className="block min-h-[76px] w-full resize-none overflow-y-auto bg-transparent px-4 pb-12 pt-4 text-sm leading-6 text-ink outline-none placeholder:text-ink/35 disabled:cursor-not-allowed"
          />

          {/* INPUT TOOLBAR */}

          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {chatText.length > 0 && canEdit && (
                <>
                  <span
                    id="chat-character-count"
                    className={`text-[10px] font-medium tabular-nums ${
                      isAtLimit
                        ? "text-red-500"
                        : isNearLimit
                          ? "text-orange-500"
                          : "text-ink/35"
                    }`}
                    aria-live="off"
                  >
                    {remainingCharacters} characters left
                  </span>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink/40 transition hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
                    aria-label="Clear message"
                    title="Clear message"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}

              {working && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-teal">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Working...
                </span>
              )}

              {!working && !disabled && chatText.length === 0 && (
                <span className="text-[10px] text-ink/35">
                  Ready for your next idea
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 focus-visible:ring-offset-2 ${
                canSubmit
                  ? "bg-ink text-white shadow-sm hover:-translate-y-0.5 hover:bg-black hover:shadow-md active:translate-y-0"
                  : "cursor-not-allowed bg-ink/[0.06] text-ink/25"
              }`}
              aria-label={working ? "Applying changes" : "Apply edit"}
              title={canSubmit ? "Apply edit" : "Enter a message first"}
            >
              {working ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* KEYBOARD HELP */}

        {canEdit && (
          <div
            id="chat-input-help"
            className="flex flex-wrap items-center justify-between gap-2 px-1"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] text-ink/40">
              <Sparkles className="h-3 w-3 shrink-0 text-teal" />
              Specific instructions give better results.
            </span>

            <div className="hidden items-center gap-1 text-[10px] text-ink/35 sm:flex">
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

        {/* QUICK EDIT SUGGESTIONS */}

        {!trimmedText && canEdit && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <WandSparkles className="h-3.5 w-3.5 text-teal" />

                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink/45">
                  Quick edits
                </h3>
              </div>

              <span className="text-[10px] text-ink/30">
                Pick a starting point
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon;

                return (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => handleSuggestion(suggestion.text)}
                    className="group flex min-w-0 items-center gap-3 rounded-xl border border-line bg-paper p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/30 hover:bg-teal/[0.035] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30 active:translate-y-0"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal/10 bg-teal/[0.08] text-teal transition-transform duration-200 group-hover:scale-105">
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-ink/75 transition-colors group-hover:text-teal">
                        {suggestion.label}
                      </span>

                      <span className="mt-1 block text-[10px] leading-4 text-ink/40">
                        {suggestion.description}
                      </span>
                    </span>

                    <ArrowUp className="h-3.5 w-3.5 shrink-0 -rotate-45 text-ink/20 transition-all group-hover:translate-x-0.5 group-hover:text-teal" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PRIMARY ACTION */}

        <Button
          type="submit"
          variant="primary"
          disabled={!canSubmit}
          aria-label={
            working ? "Applying website changes" : "Apply website edit"
          }
          className="group relative w-full gap-2 overflow-hidden rounded-xl font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {canSubmit && (
            <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/10 transition-all duration-700 group-hover:left-[110%]" />
          )}

          {working ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Applying changes...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
              <span>{trimmedText ? "Apply Edit" : "Describe an Edit"}</span>
              <ArrowUp className="ml-auto h-4 w-4 opacity-50 transition-transform group-hover:-translate-y-0.5" />
            </>
          )}
        </Button>

        {/* DISABLED STATE */}

        {disabled && (
          <div
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-ink/[0.025] px-3 py-3"
            role="status"
          >
            <span className="h-2 w-2 rounded-full bg-ink/25" />

            <p className="text-xs font-medium text-ink/45">
              Website editing is currently unavailable.
            </p>
          </div>
        )}
      </form>
    </section>
  );
}

/* =========================================================
   EMPTY CHAT STATE
========================================================= */

function EmptyChatState() {
  return (
    <div className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl px-5 py-8 text-center">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal/[0.07] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal/15 bg-teal/10 shadow-sm">
          <WandSparkles className="h-6 w-6 text-teal" />
        </div>

        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-paper bg-emerald-500 text-white"
          aria-hidden="true"
        >
          <Check className="h-3 w-3" />
        </span>
      </div>

      <h3 className="relative text-sm font-extrabold tracking-tight text-ink/80">
        Your AI design assistant is ready
      </h3>

      <p className="relative mt-2 max-w-xs text-xs leading-5 text-ink/45">
        Describe what you want to improve. Update layouts, colors, content,
        typography, spacing, and sections using natural language.
      </p>

      <div className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-teal/15 bg-teal/[0.06] px-3 py-1.5">
        <Zap className="h-3.5 w-3.5 text-teal" />

        <span className="text-[10px] font-bold text-teal">
          AI-powered website editing
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   CHAT BUBBLE
========================================================= */

function ChatBubble({
  message,
  isUser,
  isCopied,
  onCopy,
}: {
  message: ChatMessage;
  isUser: boolean;
  isCopied: boolean;
  onCopy: (id: string, content: string) => void;
}) {
  return (
    <div
      className={`group flex items-start gap-2.5 sm:gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* AVATAR */}

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

      {/* MESSAGE CONTENT */}

      <div
        className={`flex min-w-0 max-w-[86%] flex-col sm:max-w-[82%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`rounded-2xl border px-3.5 py-3 shadow-sm transition-shadow group-hover:shadow-md sm:px-4 ${
            isUser
              ? "rounded-tr-md border-accent/15 bg-accent/[0.06]"
              : "rounded-tl-md border-line bg-paper"
          }`}
        >
          <div
            className={`mb-1.5 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] ${
              isUser ? "text-accent" : "text-teal"
            }`}
          >
            {isUser ? (
              <>
                <User className="h-3 w-3" />
                You
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                AI Assistant
              </>
            )}
          </div>

          <p className="whitespace-pre-wrap break-words text-xs leading-5 text-ink sm:text-[13px] sm:leading-6">
            {message.content}
          </p>
        </div>

        {/* COPY RESPONSE */}

        {!isUser && (
          <button
            type="button"
            onClick={() => onCopy(message.id, message.content)}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold text-ink/40 transition-colors hover:bg-ink/[0.04] hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
            aria-label={isCopied ? "Message copied" : "Copy AI response"}
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Clipboard className="h-3.5 w-3.5" />
                Copy response
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   AI THINKING INDICATOR
========================================================= */

function ThinkingIndicator() {
  return (
    <div
      className="flex items-start gap-2.5 sm:gap-3"
      role="status"
      aria-label="AI is applying website changes"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-teal/15 bg-teal/10">
        <Sparkles className="h-4 w-4 animate-pulse text-teal" />
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

          <span className="ml-1.5 text-[10px] font-semibold text-ink/45">
            Working on your design...
          </span>
        </div>
      </div>
    </div>
  );
}