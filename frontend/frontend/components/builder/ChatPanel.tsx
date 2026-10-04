"use client";

import { FormEvent, KeyboardEvent } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/api";

interface ChatPanelProps {
  messages: ChatMessage[];
  chatText: string;
  setChatText: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  working: boolean;
  disabled: boolean;
}

const suggestions = [
  {
    label: "Change colors",
    text: "Make the website color palette more modern",
    icon: Palette,
  },
  {
    label: "Add section",
    text: "Add a pricing section to the website",
    icon: LayoutTemplate,
  },
  {
    label: "Change font",
    text: "Change the website font to a clean sans-serif font",
    icon: Type,
  },
];

export function ChatPanel({
  messages,
  chatText,
  setChatText,
  onSubmit,
  working,
  disabled,
}: ChatPanelProps) {
  const canEdit = !disabled && !working;
  const canSubmit = canEdit && chatText.trim().length > 0;

  /* --------------------------------------------------
     Allow Ctrl/Cmd + Enter to submit
  -------------------------------------------------- */
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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

  return (
    <div className="space-y-4 border-t border-line pt-5">

      {/* ==================================================
          HEADER
      =================================================== */}
      <div className="flex items-center justify-between gap-3">

        <div className="flex min-w-0 items-center gap-2.5">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/10">
            <MessageSquarePlus className="h-5 w-5 text-teal" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-black tracking-tight text-ink">
              Conversational Edits
            </h2>

            <p className="mt-0.5 text-[11px] text-ink/50">
              Describe what you want to change
            </p>
          </div>
        </div>

        {/* Edit Counter */}
        {messages.length > 0 && (
          <div className="shrink-0 rounded-full border border-line bg-paper px-2.5 py-1">
            <span className="text-[10px] font-bold text-ink/50">
              {messages.length}{" "}
              {messages.length === 1 ? "edit" : "edits"}
            </span>
          </div>
        )}
      </div>

      {/* ==================================================
          CHAT HISTORY
      =================================================== */}
      <div
        className="panel-scroll max-h-72 min-h-28 overflow-auto rounded-xl border border-line bg-paper/50 p-3"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          /* ------------------------------------------------
             Empty State
          ------------------------------------------------- */
          <div className="flex min-h-24 flex-col items-center justify-center px-5 py-4 text-center">

            <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
              <WandSparkles className="h-5 w-5 text-teal" />
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
                    className={`max-w-[82%] rounded-xl border px-3 py-2.5 shadow-sm ${
                      isUser
                        ? "border-accent/20 bg-accent/[0.06]"
                        : "border-line bg-white"
                    }`}
                  >
                    {/* Role */}
                    <div
                      className={`mb-1 text-[9px] font-black uppercase tracking-wider ${
                        isUser ? "text-accent" : "text-teal"
                      }`}
                    >
                      {isUser ? "You" : "AI Assistant"}
                    </div>

                    {/* Content */}
                    <p className="whitespace-pre-wrap break-words text-xs leading-5 text-ink">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* AI Thinking */}
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
                      style={{ animationDelay: "120ms" }}
                    />

                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal"
                      style={{ animationDelay: "240ms" }}
                    />

                    <span className="ml-1 text-[9px] font-medium text-ink/40">
                      Thinking...
                    </span>

                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================================================
          INPUT
      =================================================== */}
      <form onSubmit={onSubmit} className="space-y-2.5">

        <div
          className={`relative rounded-xl border bg-paper transition-all ${
            canEdit
              ? "border-line focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/10"
              : "border-line opacity-70"
          }`}
        >
          <textarea
            value={chatText}
            onChange={(event) => setChatText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the change you want..."
            disabled={!canEdit}
            rows={4}
            aria-label="Describe your website edit"
            className="min-h-24 w-full resize-none rounded-xl bg-transparent px-3.5 py-3 pr-14 text-sm leading-5 text-ink outline-none placeholder:text-ink/35 disabled:cursor-not-allowed"
          />

          {/* Character Count */}
          <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
            {chatText.length > 0 && (
              <span className="text-[9px] text-ink/30">
                {chatText.length}
              </span>
            )}
          </div>
        </div>

        {/* Keyboard Hint */}
        {canEdit && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] text-ink/30">
              Be specific for better results
            </span>

            <span className="hidden text-[9px] text-ink/30 sm:block">
              Ctrl + Enter to apply
            </span>
          </div>
        )}

        {/* ==================================================
            QUICK SUGGESTIONS
        =================================================== */}
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
                    onClick={() => setChatText(suggestion.text)}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1.5 text-[10px] font-semibold text-ink/55 transition-all hover:border-teal/40 hover:bg-teal/5 hover:text-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                  >
                    <Icon className="h-3 w-3 transition-transform group-hover:scale-110" />
                    {suggestion.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================
            SUBMIT BUTTON
        =================================================== */}
        <Button
          type="submit"
          variant="primary"
          className="w-full gap-2 rounded-lg font-bold transition-all"
          disabled={!canSubmit}
        >
          {working ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Applying Changes...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Apply Edit
            </>
          )}
        </Button>

        {/* Disabled Message */}
        {disabled && (
          <div className="rounded-md bg-ink/[0.03] px-3 py-2 text-center">
            <p className="text-[10px] font-medium text-ink/40">
              Editing is currently unavailable
            </p>
          </div>
        )}
      </form>
    </div>
  );
}