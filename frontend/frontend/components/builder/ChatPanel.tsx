"use client";

import { FormEvent } from "react";
import { MessageSquarePlus, Send, Loader2 } from "lucide-react";
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

export function ChatPanel({ messages, chatText, setChatText, onSubmit, working, disabled }: ChatPanelProps) {
  return (
    <div className="space-y-3 pt-4 border-t border-line">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="h-5 w-5 text-teal" />
        <h2 className="text-lg font-black tracking-normal text-ink">Conversational Edits</h2>
      </div>

      <div className="panel-scroll max-h-56 space-y-2.5 overflow-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-xs text-ink/50 italic py-2">No edit history yet. Ask the AI to change colors, add sections, or edit text below.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg border p-2.5 text-sm ${
                message.role === "user" ? "border-accent/30 bg-accent/8 ml-2 text-ink" : "border-line bg-paper mr-2 text-ink"
              }`}
            >
              <p className="text-[10px] font-bold uppercase text-ink/45">{message.role}</p>
              <p className="mt-1 leading-5 text-xs font-sans">{message.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <textarea
          className="min-h-20 w-full resize-y rounded-md border border-line bg-paper px-3 py-2 text-sm leading-5 outline-none focus:border-teal text-ink"
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder="e.g., 'Make the hero section dark blue', 'Add a pricing table', 'Change body font to sans-serif'..."
          disabled={disabled || working}
        />
        <Button type="submit" variant="primary" className="w-full font-bold" disabled={disabled || working || !chatText.trim()}>
          {working ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />} Apply Edit
        </Button>
      </form>
    </div>
  );
}
