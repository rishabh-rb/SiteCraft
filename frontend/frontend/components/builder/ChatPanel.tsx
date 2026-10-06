"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
} from "react";
import {
  MessageSquarePlus,
  Send,
  Loader2,
  Sparkles,
  User,
  WandSparkles,
  Palette,
  LayoutTemplate,
  Type,
  ArrowUp,
  CheckCircle2,
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

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_MESSAGE_LENGTH = 1000;

const suggestions = [
  {
    label: "Modern colors",
    text: "Make the website color palette more modern and visually appealing",
    icon: Palette,
  },
  {
    label: "Add pricing",
    text: "Add a clean and responsive pricing section to the website",
    icon: LayoutTemplate,
  },
  {
    label: "Change font",
    text: "Change the website font to a clean, modern sans-serif font",
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

  const canEdit = !disabled && !working;
  const trimmedText = chatText.trim();
  const canSubmit =
    canEdit &&
    trimmedText.length > 0 &&
    chatText.length <= MAX_MESSAGE_LENGTH;

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length, working]);

  /* =======================================================
     AUTO RESIZE TEXTAREA
  ======================================================= */

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      180
    )}px`;
  }, [chatText]);

  /* =======================================================
     KEYBOARD SHORTCUT
  ======================================================= */

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "Enter" &&
      canSubmit
    ) {
      event.preventDefault();

      const form = event.currentTarget.form;

      if (form) {
        form.requestSubmit();
      }
    }
  };

  /* =======================================================
     INPUT CHANGE
  ======================================================= */

  const handleChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = event.target.value;

    if (value.length <= MAX_MESSAGE_LENGTH) {
      setChatText(value);
    }
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

  const remainingCharacters =
    MAX_MESSAGE_LENGTH - chatText.length;

  const isNearLimit = remainingCharacters <= 100;

  return (
    <section
      className="space-y-4 border-t border-line pt-5"
      aria-label="Conversational website editor">

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/10">
            <MessageSquarePlus className="h-5 w-5 text-teal" />

            {!disabled && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-emerald-500" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-black tracking-tight text-ink">
                Conversational Edits
              </h2>

              {!disabled && (
                <span className="hidden rounded-full bg-teal/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-teal sm:inline-flex">
                  AI
                </span>
              )}
            </div>

            <p className="mt-0.5 text-[11px] text-ink/50">
              Describe what you want to change
            </p>
          </div>
        </div>

        {/* Edit Counter */}
        {messages.length > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1">
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
        className="panel-scroll max-h-80 min-h-28 overflow-auto rounded-xl border border-line bg-paper/50 p-3"
        aria-live="polite"
        aria-label="Edit conversation"
      >
        {messages.length === 0 ? (
          /* ------------------------------------------------
             EMPTY STATE
          ------------------------------------------------- */

          <div className="flex min-h-28 flex-col items-center justify-center px-5 py-5 text-center">
            <div className="relative mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-teal/10">
              <WandSparkles className="h-5 w-5 text-teal" />

              <span className="absolute inset-0 animate-ping rounded-full bg-teal/10" />
            </div>

            <p className="text-xs font-bold text-ink/75">
              Your AI design assistant is ready
            </p>

            <p className="mt-1 max-w-xs text-[11px] leading-4 text-ink/45">
              Ask me to change colors, update text, add sections,
              modify layouts, or improve your website.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex gap-2.5 ${
                    isUser
                      ? "flex-row-reverse"
                      : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      isUser
                        ? "bg-accent/10 text-accent"
                        : "bg-teal/10 text-teal"
                    }`}
                    aria-hidden="true"
                  >
                    {isUser ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div
                    className={`max-w-[82%] rounded-xl border px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md ${
                      isUser
                        ? "border-accent/20 bg-accent/[0.06]"
                        : "border-line bg-white"
                    }`}
                  >
                    <div
                      className={`mb-1 text-[9px] font-black uppercase tracking-wider ${
                        isUser
                          ? "text-accent"
                          : "text-teal"
                      }`}
                    >
                      {isUser ? "You" : "AI Assistant"}
                    </div>

                    <p className="whitespace-pre-wrap break-words text-xs leading-5 text-ink">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* AI THINKING */}

            {working && (
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10">
                  <Sparkles className="h-3.5 w-3.5 text-teal" />
                </div>

                <div className="rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-sm">
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
                      Applying your changes...
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
          INPUT FORM
      ================================================== */}

      <form
        onSubmit={onSubmit}
        className="space-y-2.5"
      >
        <div
          className={`relative overflow-hidden rounded-xl border bg-paper transition-all duration-200 ${
            canEdit
              ? "border-line focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/10"
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
                : "Describe the change you want..."
            }
            disabled={!canEdit}
            rows={3}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label="Describe your website edit"
            aria-describedby="chat-input-help"
            className="min-h-24 w-full resize-none overflow-y-auto rounded-xl bg-transparent px-3.5 py-3 pr-14 text-sm leading-5 text-ink outline-none placeholder:text-ink/35 disabled:cursor-not-allowed"
          />

          {/* Input Status */}

          <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
            {chatText.length > 0 && (
              <span
                className={`text-[9px] font-medium ${
                  isNearLimit
                    ? "text-orange-500"
                    : "text-ink/30"
                }`}
              >
                {chatText.length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>
        </div>

        {/* ==================================================
            INPUT HINTS
        ================================================== */}

        {canEdit && (
          <div
            id="chat-input-help"
            className="flex items-center justify-between px-1"
          >
            <span className="text-[9px] text-ink/30">
              Be specific for better results
            </span>

            <span className="hidden items-center gap-1.5 text-[9px] text-ink/30 sm:flex">
              <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-medium">
                Ctrl
              </kbd>
              +
              <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-medium">
                Enter
              </kbd>
              to apply
            </span>
          </div>
        )}

        {/* ==================================================
            QUICK SUGGESTIONS
        ================================================== */}

        {!chatText.trim() && canEdit && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <Sparkles className="h-3 w-3 text-teal" />

              <span className="text-[9px] font-bold uppercase tracking-wider text-ink/35">
                Quick edits
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon;

                return (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() =>
                      handleSuggestion(suggestion.text)
                    }
                    className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1.5 text-[10px] font-semibold text-ink/55 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/40 hover:bg-teal/5 hover:text-teal hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal/20 active:translate-y-0"
                  >
                    <Icon className="h-3 w-3 transition-transform duration-200 group-hover:scale-110" />

                    {suggestion.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================
            SUBMIT BUTTON
        ================================================== */}

        <Button
          type="submit"
          variant="primary"
          className="group w-full gap-2 rounded-lg font-bold transition-all"
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
              <Send className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              Apply Edit
              <ArrowUp className="ml-auto h-3.5 w-3.5 opacity-40 transition-transform group-hover:-translate-y-0.5" />
            </>
          )}
        </Button>

        {/* ==================================================
            DISABLED STATE
        ================================================== */}

        {disabled && (
          <div className="flex items-center justify-center gap-2 rounded-md bg-ink/[0.03] px-3 py-2">
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
