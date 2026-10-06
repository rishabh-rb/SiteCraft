"use client";

import { FormEvent } from "react";
import {
  Bot,
  Loader2,
  WandSparkles,
  Sparkles,
  Clock3,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptInputProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  working: boolean;
}

const EXAMPLE_PROMPTS = [
  {
    title: "Developer Portfolio",
    prompt:
      "Modern portfolio for a software engineer with dark mode, blue/purple accents, skills, projects & contact form.",
  },
  {
    title: "AI SaaS",
    prompt:
      "SaaS landing page for an AI code assistant with hero, features grid, pricing table, and testimonials.",
  },
  {
    title: "Cafe & Restaurant",
    prompt:
      "Boutique cafe & restaurant website with menu highlights, seasonal specials, store location & reservation form.",
  },
];

export function PromptInput({
  prompt,
  setPrompt,
  onSubmit,
  working,
}: PromptInputProps) {
  const characterCount = prompt.length;
  const maxCharacters = 3000;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <WandSparkles className="h-4 w-4 text-accent" />
          </div>

          <div>
            <h2 className="text-sm font-black tracking-tight text-ink">
              Build your website
            </h2>
            <p className="text-[10px] font-medium text-ink/40">
              Describe what you want to create
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-1 rounded-full border border-line bg-paper px-2 py-1 sm:flex">
          <Sparkles className="h-3 w-3 text-teal" />
          <span className="text-[9px] font-bold uppercase tracking-wide text-ink/45">
            AI Powered
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {/* Prompt Box */}
        <div className="group relative overflow-hidden rounded-xl border border-line bg-paper transition-all duration-200 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your ideal website, including style, colors, pages, sections, features, and content..."
            maxLength={maxCharacters}
            required
            disabled={working}
            className="min-h-36 w-full resize-none bg-transparent px-4 py-3.5 pb-8 text-sm leading-6 text-ink outline-none placeholder:text-ink/30 disabled:cursor-not-allowed disabled:opacity-60"
          />

          {/* Character Counter */}
          <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
            <span
              className={`text-[9px] font-semibold ${
                characterCount > maxCharacters * 0.9
                  ? "text-accent"
                  : "text-ink/30"
              }`}
            >
              {characterCount}/{maxCharacters}
            </span>
          </div>

          {/* Bottom Accent */}
          <div className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-accent transition-transform duration-300 group-focus-within:scale-x-100" />
        </div>

        {/* Generate Button */}
        <Button
          type="submit"
          variant="accent"
          disabled={working || !prompt.trim()}
          className="group h-10 w-full rounded-lg font-bold shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed"
        >
          {working ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Website...
            </>
          ) : (
            <>
              <Bot className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              Generate Website
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      {/* Example Prompts */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/40">
            Try an example
          </p>

          <div className="flex items-center gap-1 text-ink/30">
            <Clock3 className="h-3 w-3" />
            <span className="text-[9px] font-medium">
              One click to use
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          {EXAMPLE_PROMPTS.map((example) => {
            const isSelected = prompt === example.prompt;

            return (
              <button
                key={example.title}
                type="button"
                onClick={() => setPrompt(example.prompt)}
                disabled={working}
                className={`group w-full rounded-lg border p-2.5 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "border-accent/30 bg-accent/[0.06]"
                    : "border-transparent hover:border-line hover:bg-black/[0.025]"
                }`}
              >
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold ${
                      isSelected ? "text-accent" : "text-ink/65"
                    }`}
                  >
                    {example.title}
                  </span>

                  <ArrowUpRight
                    className={`h-3 w-3 shrink-0 transition-all duration-200 ${
                      isSelected
                        ? "text-accent"
                        : "text-ink/20 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                    }`}
                  />
                </div>

                <p className="line-clamp-2 text-[10px] leading-4 text-ink/45">
                  {example.prompt}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}