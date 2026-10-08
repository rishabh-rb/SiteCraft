"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
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

const suggestions: Suggestion[] = [
  {
    label: "Modern colors",
    description: "Refresh the color palette",
    text: "Make the website color palette more modern, balanced, and visually appealing.",
    icon: Palette,
  },
  {
    label: "Add pricing",
    description: "Create a pricing section",
    text: "Add a clean, modern, responsive pricing section with attractive pricing cards and a clear call-to-action.",
    icon: LayoutTemplate,
  },
  {
    label: "Better typography",
    description: "Improve fonts and spacing",
    text: "Improve the website typography using a clean modern sans-serif font, better font sizes, spacing, and hierarchy.",
    icon: Type,
  },
];

/* =========================================================
   COMPONENT
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canEdit = !disabled && !working;
  const trimmedText = chatText.trim();

  const canSubmit =
    canEdit &&
    trimmedText.length > 0 &&
    chatText.length <= MAX_MESSAGE_LENGTH;

  const remainingCharacters = MAX_MESSAGE_LENGTH - chatText.length;

  const isNearLimit = remainingCharacters <= 120;
  const isAtLimit = remainingCharacters <= 0;

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages.length, working]);

  /* =======================================================
     AUTO RESIZE TEXTAREA
  ======================================================= */

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, 76),
      190
    );

    textarea.style.height = `${nextHeight}px`;
  }, [chatText]);

  /* =======================================================
     INITIAL FOCUS
  ======================================================= */

  useEffect(() => {
    if (canEdit && messages.length === 0) {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [canEdit, messages.length]);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  /* =======================================================
     KEYBOARD HANDLING
  ======================================================= */

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    const isEnter = event.key === "Enter";
    const isShiftEnter = isEnter && event.shiftKey;

    if (isShiftEnter) return;

    if (isEnter && canSubmit) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  /* =======================================================
     INPUT CHANGE
  ======================================================= */

  const handleChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;

    if (value.length <= MAX_MESSAGE_LENGTH) {
      setChatText(value);
    }
  };

  /* =======================================================
     CLEAR INPUT
  ======================================================= */

  const handleClear = () => {
    setChatText("");

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  /* =======================================================
     QUICK SUGGESTION
  ======================================================= */

  const handleSuggestion = (text: string) => {
    setChatText(text);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  /* =======================================================
     COPY MESSAGE
  ======================================================= */

  const handleCopy = async (
    id: string,
    content: string
  ) => {
    try {
      await navigator.clipboard.writeText(content);

      setCopiedId(id);

      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedId(null);
      }, 1600);
    } catch {
      // Clipboard unavailable.
    }
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    if (!canSubmit) {
      event.preventDefault();
      return;
    }

    onSubmit(event);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      className="space-y-4 border-t border-line pt-5"
      aria-label="Conversational website editor"
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10">
            <MessageSquarePlus className="h-5 w-5 text-teal" />

            {!disabled && (
              <span
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-emerald-500"
                aria-label="AI editor available"
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-black tracking-tight text-ink">
                Conversational Edits
              </h2>

              {!disabled && (
                <span className="hidden items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-teal sm:inline-flex">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI
                </span>
              )}
            </div>

            <p className="mt-0.5 text-[11px] text-ink/50">
              Describe what you want to change
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1.5">
            <CheckCircle2 className="h-3 w-3 text-teal" />

            <span className="text-[10px] font-bold text-ink/50">
              {messages.length}{" "}
              {messages.length === 1 ? "edit" : "edits"}
            </span>
          </div>
        )}
      </div>

      {/* ==================================================
          CHAT HISTORY
      ================================================== */}

      <div
        className="panel-scroll max-h-80 min-h-32 overflow-y-auto rounded-2xl border border-line bg-paper/50 p-3"
        aria-live="polite"
        aria-label="Edit conversation"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-28 flex-col items-center justify-center px-5 py-6 text-center">
            <div className="relative mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10">
                <WandSparkles className="h-5 w-5 text-teal" />
              </div>

              <span className="absolute inset-0 animate-pulse rounded-full border border-teal/10" />
            </div>

            <p className="text-xs font-bold text-ink/80">
              Your AI design assistant is ready
            </p>

            <p className="mt-1.5 max-w-xs text-[11px] leading-4 text-ink/45">
              Tell me what you want to change. Update colors,
              text, layouts, sections, spacing, typography, and
              more.
            </p>

            <div className="mt-3 flex items-center gap-1.5 rounded-full bg-teal/5 px-2.5 py-1">
              <Zap className="h-3 w-3 text-teal" />

              <span className="text-[9px] font-semibold text-teal">
                AI-powered website editing
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isUser = message.role === "user";
              const isCopied = copiedId === message.id;

              return (
                <div
                  key={message.id}
                  className={`group flex gap-2.5 ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      isUser
                        ? "bg-accent/10 text-accent"
                        : "bg-teal/10 text-teal"
                    }`}
                  >
                    {isUser ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Message */}
                  <div
                    className={`flex max-w-[84%] flex-col ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl border px-3 py-2.5 shadow-sm transition-all duration-200 group-hover:shadow-md ${
                        isUser
                          ? "rounded-tr-md border-accent/20 bg-accent/[0.06]"
                          : "rounded-tl-md border-line bg-white"
                      }`}
                    >
                      <div
                        className={`mb-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider ${
                          isUser
                            ? "text-accent"
                            : "text-teal"
                        }`}
                      >
                        {isUser ? (
                          <>
                            <User className="h-2.5 w-2.5" />
                            You
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-2.5 w-2.5" />
                            AI Assistant
                          </>
                        )}
                      </div>

                      <p className="whitespace-pre-wrap break-words text-xs leading-5 text-ink">
                        {message.content}
                      </p>
                    </div>

                    {!isUser && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            message.id,
                            message.content
                          )
                        }
                        className="mt-1 flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-medium text-ink/30 opacity-0 transition-all hover:bg-ink/[0.04] hover:text-ink/60 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-teal/20 group-hover:opacity-100"
                        aria-label={
                          isCopied
                            ? "Message copied"
                            : "Copy AI response"
                        }
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Clipboard className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* AI THINKING */}
            {working && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-teal" />
                </div>

                <div className="rounded-2xl rounded-tl-md border border-line bg-white px-3.5 py-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal" />

                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal"
                      style={{
                        animationDelay: "120ms",
                      }}
                    />

                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal"
                      style={{
                        animationDelay: "240ms",
                      }}
                    />

                    <span className="ml-1 text-[9px] font-medium text-ink/40">
                      Applying changes...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ==================================================
          INPUT
      ================================================== */}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div
          className={`relative overflow-hidden rounded-2xl border bg-paper transition-all duration-200 ${
            canEdit
              ? "border-line shadow-sm focus-within:border-teal/50 focus-within:ring-4 focus-within:ring-teal/5"
              : "border-line opacity-70"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={chatText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? "Editing is currently unavailable..."
                : working
                  ? "AI is applying your changes..."
                  : "Describe the change you want..."
            }
            disabled={!canEdit}
            rows={3}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label="Describe your website edit"
            aria-describedby="chat-input-help"
            className="block min-h-[76px] w-full resize-none overflow-y-auto bg-transparent px-3.5 pb-12 pt-3.5 pr-14 text-sm leading-5 text-ink outline-none placeholder:text-ink/35 disabled:cursor-not-allowed"
          />

          {/* Input Controls */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {chatText.length > 0 && canEdit && (
                <>
                  <span
                    className={`text-[9px] font-medium ${
                      isAtLimit
                        ? "text-red-500"
                        : isNearLimit
                          ? "text-orange-500"
                          : "text-ink/30"
                    }`}
                  >
                    {chatText.length}/{MAX_MESSAGE_LENGTH}
                  </span>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-ink/30 transition-colors hover:bg-ink/[0.05] hover:text-ink/60 focus:outline-none focus:ring-2 focus:ring-teal/20"
                    aria-label="Clear message"
                    title="Clear"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                canSubmit
                  ? "bg-ink text-white shadow-sm hover:-translate-y-0.5 hover:bg-black hover:shadow-md active:translate-y-0"
                  : "cursor-not-allowed bg-ink/[0.06] text-ink/20"
              }`}
              aria-label={
                working
                  ? "Applying changes"
                  : "Apply edit"
              }
            >
              {working ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* ==================================================
            INPUT HINT
        ================================================== */}

        {canEdit && (
          <div
            id="chat-input-help"
            className="flex items-center justify-between px-1"
          >
            <span className="flex items-center gap-1 text-[9px] text-ink/30">
              <Sparkles className="h-2.5 w-2.5" />
              Be specific for better results
            </span>

            <span className="hidden items-center gap-1.5 text-[9px] text-ink/30 sm:flex">
              <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-medium">
                Enter
              </kbd>
              to apply

              <span className="mx-0.5 text-ink/20">
                •
              </span>

              <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-medium">
                Shift
              </kbd>
              +
              <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-medium">
                Enter
              </kbd>
              for new line
            </span>
          </div>
        )}

        {/* ==================================================
            QUICK EDITS
        ================================================== */}

        {!chatText.trim() && canEdit && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-teal" />

                <span className="text-[9px] font-bold uppercase tracking-wider text-ink/35">
                  Quick edits
                </span>
              </div>

              <span className="text-[8px] font-medium text-ink/25">
                Try one
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon;

                return (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() =>
                      handleSuggestion(suggestion.text)
                    }
                    className="group flex items-center gap-2 rounded-xl border border-line bg-paper px-2.5 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/30 hover:bg-teal/[0.04] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal/20 active:translate-y-0"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal/10 text-teal transition-all duration-200 group-hover:bg-teal/15">
                      <Icon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-bold text-ink/65 group-hover:text-teal">
                        {suggestion.label}
                      </span>

                      <span className="mt-0.5 block truncate text-[8px] text-ink/30">
                        {suggestion.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================
            MAIN ACTION
        ================================================== */}

        <Button
          type="submit"
          variant="primary"
          className="group w-full gap-2 rounded-xl font-bold transition-all"
          disabled={!canSubmit}
          aria-label={
            working
              ? "Applying website changes"
              : "Apply website edit"
          }
        >
          {working ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Applying Changes...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" />

              <span>
                {chatText.trim()
                  ? "Apply Edit"
                  : "Describe an Edit"}
              </span>

              <ArrowUp className="ml-auto h-3.5 w-3.5 opacity-40 transition-transform duration-200 group-hover:-translate-y-0.5" />
            </>
          )}
        </Button>

        {/* ==================================================
            DISABLED STATE
        ================================================== */}

        {disabled && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-ink/[0.03] px-3 py-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ink/25" />

            <p className="text-[10px] font-medium text-ink/40">
              Editing is currently unavailable
            </p>
          </div>
        )}
      </form>
    </section>
  );
}