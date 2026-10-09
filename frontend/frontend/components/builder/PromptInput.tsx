
"use client";

import { useMemo, type FormEvent } from "react";
import {
  ArrowUpRight,
  Bot,
  Check,
  Clock3,
  Loader2,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface PromptInputProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  working: boolean;
}

const MAX_CHARACTERS = 3000;

const EXAMPLE_PROMPTS = [
  {
    title: "Developer Portfolio",
    description: "Dark, modern and professional",
    prompt:
      "Create a modern portfolio website for a software engineer. Use a dark theme with blue and purple accents, smooth animations, a hero section, skills, projects, experience, achievements, and a functional contact form. Make the layout responsive and visually polished.",
  },
  {
    title: "AI SaaS",
    description: "Clean product landing page",
    prompt:
      "Build a modern SaaS landing page for an AI code assistant. Include a compelling hero section, feature grid, product workflow, pricing plans, testimonials, FAQ, and a strong call to action. Use clean typography, subtle gradients, interactive elements, and a responsive layout.",
  },
  {
    title: "Cafe & Restaurant",
    description: "Warm and elegant experience",
    prompt:
      "Design an elegant website for a boutique cafe and restaurant. Use warm colors, beautiful food imagery, refined typography, menu highlights, seasonal specials, a gallery, opening hours, location details, and a reservation form. Make the experience welcoming and mobile-friendly.",
  },
] as const;

export function PromptInput({
  prompt,
  setPrompt,
  onSubmit,
  working,
}: PromptInputProps) {
  const characterCount = prompt.length;
  const trimmedPrompt = prompt.trim();
  const canGenerate = trimmedPrompt.length > 0 && !working;

  const selectedExample = useMemo(
    () => EXAMPLE_PROMPTS.some((example) => example.prompt === prompt),
    [prompt],
  );

  const characterStatus = useMemo(() => {
    const percentage = characterCount / MAX_CHARACTERS;

    if (percentage >= 0.95) return "text-red-500";
    if (percentage >= 0.8) return "text-amber-500";

    return "text-ink/35";
  }, [characterCount]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canGenerate) return;

    onSubmit(event);
  };

  return (
    <section
      className="space-y-5"
      aria-labelledby="prompt-input-heading"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/15 bg-accent/10 shadow-sm">
            <WandSparkles
              className="h-5 w-5 text-accent"
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="prompt-input-heading"
                className="text-sm font-black tracking-tight text-ink sm:text-base"
              >
                Build your website
              </h2>

              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-accent">
                AI powered
              </span>
            </div>

            <p className="mt-1 max-w-sm text-xs leading-5 text-ink/45">
              Describe your idea and let AI turn it into a website.
            </p>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1.5 sm:flex">
          <Sparkles
            className="h-3.5 w-3.5 text-teal"
            aria-hidden="true"
          />
          <span className="text-[9px] font-bold uppercase tracking-wider text-ink/45">
            AI powered
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Prompt editor */}
        <div
          className={`group relative overflow-hidden rounded-2xl border bg-paper shadow-sm transition-all duration-200 ${
            working
              ? "border-line opacity-80"
              : "border-line hover:border-ink/20 focus-within:border-accent/50 focus-within:shadow-md focus-within:ring-4 focus-within:ring-accent/5"
          }`}
        >
          {/* Editor header */}
          <div className="flex min-h-10 items-center justify-between gap-3 border-b border-line/70 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex shrink-0 items-center gap-1"
                aria-hidden="true"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
                <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
                <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
              </div>

              <span className="truncate text-[10px] font-bold uppercase tracking-wider text-ink/40">
                Website prompt
              </span>
            </div>

            {selectedExample && (
              <span className="flex shrink-0 items-center gap-1 text-accent">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="text-[9px] font-bold">
                  Example selected
                </span>
              </span>
            )}
          </div>

          {/* Textarea */}
          <label htmlFor="website-prompt" className="sr-only">
            Describe the website you want to generate
          </label>

          <textarea
            id="website-prompt"
            name="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="What would you like to build? Describe the design, pages, features, colors, and overall experience..."
            maxLength={MAX_CHARACTERS}
            required
            disabled={working}
            aria-describedby="prompt-hint prompt-character-count"
            className="min-h-[165px] w-full resize-y bg-transparent px-4 py-4 pb-5 text-sm leading-6 text-ink outline-none placeholder:text-ink/30 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[185px]"
          />

          {/* Editor footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-paper/80 px-4 py-2.5">
            <p
              id="prompt-hint"
              className="flex items-center gap-1.5 text-[10px] leading-4 text-ink/40"
            >
              <Sparkles
                className="h-3 w-3 shrink-0 text-teal"
                aria-hidden="true"
              />
              Be specific for better results
            </p>

            <span
              id="prompt-character-count"
              className={`shrink-0 text-[10px] font-bold tabular-nums ${characterStatus}`}
              aria-live="polite"
            >
              {characterCount.toLocaleString()} /{" "}
              {MAX_CHARACTERS.toLocaleString()}
            </span>
          </div>

          {/* Focus accent */}
          <div
            className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-accent transition-transform duration-300 group-focus-within:scale-x-100"
            aria-hidden="true"
          />
        </div>

        {/* Generate button */}
        <Button
          type="submit"
          variant="accent"
          disabled={!canGenerate}
          aria-busy={working}
          className="group relative h-12 w-full overflow-hidden rounded-xl font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="relative z-10 flex items-center justify-center">
            {working ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Generating your website...
              </>
            ) : (
              <>
                <Bot
                  className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110"
                  aria-hidden="true"
                />
                Generate Website
                <ArrowUpRight
                  className="ml-1.5 h-4 w-4 opacity-70 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </>
            )}
          </span>

          {!working && trimmedPrompt.length > 0 && (
            <span
              className="pointer-events-none absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full"
              aria-hidden="true"
            />
          )}
        </Button>
      </form>

      {/* Quick-start examples */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/50">
              Quick start
            </p>
            <p className="mt-1 text-[10px] leading-4 text-ink/40">
              Choose an idea to get started instantly.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1.5">
            <Clock3
              className="h-3 w-3 text-ink/40"
              aria-hidden="true"
            />
            <span className="text-[9px] font-bold text-ink/45">
              One click
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EXAMPLE_PROMPTS.map((example) => {
            const isSelected = prompt === example.prompt;

            return (
              <button
                key={example.title}
                type="button"
                onClick={() => setPrompt(example.prompt)}
                disabled={working}
                aria-pressed={isSelected}
                aria-label={`Use ${example.title} prompt example`}
                className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 ${
                  isSelected
                    ? "border-accent/35 bg-accent/[0.06] shadow-sm"
                    : "border-line/70 bg-paper hover:-translate-y-0.5 hover:border-accent/25 hover:bg-black/[0.015] hover:shadow-sm"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className={`text-[11px] font-black ${
                        isSelected ? "text-accent" : "text-ink/75"
                      }`}
                    >
                      {example.title}
                    </span>

                    <p className="mt-1 text-[10px] font-semibold leading-4 text-ink/40">
                      {example.description}
                    </p>
                  </div>

                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isSelected
                        ? "bg-accent/10 text-accent"
                        : "bg-black/[0.03] text-ink/35 group-hover:bg-accent/10 group-hover:text-accent"
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    )}
                  </span>
                </div>

                <p className="mt-3 line-clamp-3 text-[10px] leading-4 text-ink/45">
                  {example.prompt}
                </p>

                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span
                    className={`text-[9px] font-bold ${
                      isSelected ? "text-accent" : "text-ink/35"
                    }`}
                  >
                    {isSelected ? "Selected" : "Use this prompt"}
                  </span>

                  {isSelected && (
                    <Check
                      className="h-3.5 w-3.5 text-accent"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Selected indicator */}
                <div
                  className={`absolute bottom-0 left-0 h-0.5 bg-accent transition-all duration-300 ${
                    isSelected ? "w-full" : "w-0 group-hover:w-1/3"
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}