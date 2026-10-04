"use client";

import { FormEvent } from "react";
import {
  MessageSquarePlus,
  Send,
  Loader2,
  Sparkles,
  User,
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

export function ChatPanel({
  messages,
  chatText,
  setChatText,
  onSubmit,
  working,
  disabled,
}: ChatPanelProps) {
  return (
    <div className="space-y-4 pt-5 border-t border-line">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/10">
            <MessageSquarePlus className="h-5 w-5 text-teal" />
          </div>

          <div>
            <h2 className="text-lg font-black tracking-tight text-ink">
              Conversational Edits
            </h2>

            <p className="text-[11px] text-ink/50">
              Tell the AI what you want to change
            </p>
          </div>
        </div>

        {/* Edit Counter */}
        {messages.length > 0 && (
          <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[10px] font-bold text-ink/50">
            {messages.length}{" "}
            {messages.length === 1 ? "edit" : "edits"}
          </span>
        )}
      </div>

      {/* Chat History */}
      <div className="panel-scroll max-h-64 min-h-24 space-y-3 overflow-auto rounded-lg border border-line bg-paper/50 p-3">

        {/* Empty State */}
        {messages.length === 0 ? (
          <div className="flex min-h-20 flex-col items-center justify-center px-4 py-3 text-center">

            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-teal/10">
              <Sparkles className="h-4 w-4 text-teal" />
            </div>

            <p className="text-xs font-semibold text-ink/70">
              No edits yet
            </p>

            <p className="mt-1 max-w-xs text-[11px] leading-4 text-ink/45">
              Ask the AI to change colors, modify text, add sections,
              adjust layouts, or update your website.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >

                {/* Avatar */}
                <div
                  className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
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

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-xl border px-3 py-2.5 ${
                    isUser
                      ? "border-accent/20 bg-accent/5"
                      : "border-line bg-paper"
                  }`}
                >
                  <div
                    className={`mb-1 text-[9px] font-bold uppercase tracking-wider ${
                      isUser ? "text-accent" : "text-teal"
                    }`}
                  >
                    {isUser ? "You" : "AI"}
                  </div>

                  <p className="text-xs leading-5 text-ink">
                    {message.content}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* AI Working Indicator */}
        {working && (
          <div className="flex items-center gap-2 px-1">

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10">
              <Sparkles className="h-3.5 w-3.5 text-teal" />
            </div>

            <div className="rounded-xl border border-line bg-paper px-3 py-2">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal" />

                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal"
                  style={{ animationDelay: "100ms" }}
                />

                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal"
                  style={{ animationDelay: "200ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={onSubmit} className="space-y-2.5">

        {/* Textarea */}
        <div className="relative">
          <textarea
            className="min-h-24 w-full resize-none rounded-lg border border-line bg-paper px-3.5 py-3 pr-12 text-sm leading-5 text-ink outline-none transition-all placeholder:text-ink/35 focus:border-teal focus:ring-2 focus:ring-teal/10 disabled:cursor-not-allowed disabled:opacity-60"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder="Describe the change you want..."
            disabled={disabled || working}
          />

          {/* Character Counter */}
          <span className="absolute bottom-2 right-2.5 text-[9px] text-ink/30">
            {chatText.length}
          </span>
        </div>

        {/* Quick Suggestions */}
        {!chatText.trim() && !disabled && !working && (
          <div className="flex flex-wrap gap-1.5">

            <button
              type="button"
              onClick={() => setChatText("Make the hero section darker")}
              className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-medium text-ink/55 transition hover:border-teal/40 hover:bg-teal/5 hover:text-teal"
            >
              Make hero darker
            </button>

            <button
              type="button"
              onClick={() => setChatText("Add a pricing section")}
              className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-medium text-ink/55 transition hover:border-teal/40 hover:bg-teal/5 hover:text-teal"
            >
              Add pricing
            </button>

            <button
              type="button"
              onClick={() => setChatText("Change the font to sans-serif")}
              className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-medium text-ink/55 transition hover:border-teal/40 hover:bg-teal/5 hover:text-teal"
            >
              Change font
            </button>
          </div>
        )}

        {/* Apply Button */}
        <Button
          type="submit"
          variant="primary"
          className="w-full gap-1.5 font-bold transition-all"
          disabled={disabled || working || !chatText.trim()}
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
          <p className="text-center text-[10px] text-ink/40">
            Editing is currently unavailable
          </p>
        )}
      </form>
    </div>
  );
}