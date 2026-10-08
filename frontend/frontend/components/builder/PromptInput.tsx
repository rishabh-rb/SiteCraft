"use client";

import { FormEvent, useMemo } from "react";
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

const EXAMPLE_PROMPTS = [
{
title: "Developer Portfolio",
description: "Dark, modern and professional",
prompt:
"Modern portfolio for a software engineer with dark mode, blue and purple accents, skills, projects, experience, achievements and a contact form.",
},
{
title: "AI SaaS",
description: "Clean product landing page",
prompt:
"Modern SaaS landing page for an AI code assistant with a strong hero section, feature grid, workflow section, pricing plans, testimonials, FAQ and call-to-action.",
},
{
title: "Cafe & Restaurant",
description: "Warm and elegant experience",
prompt:
"Boutique cafe and restaurant website with an elegant visual style, menu highlights, seasonal specials, gallery, opening hours, location and reservation form.",
},
];

const MAX_CHARACTERS = 3000;

export function PromptInput({
prompt,
setPrompt,
onSubmit,
working,
}: PromptInputProps) {
const characterCount = prompt.length;

const characterStatus = useMemo(() => {
const percentage = characterCount / MAX_CHARACTERS;

```
if (percentage >= 0.95) {
  return "text-red-500";
}

if (percentage >= 0.8) {
  return "text-amber-500";
}

return "text-ink/30";
```

}, [characterCount]);

const selectedExample = EXAMPLE_PROMPTS.some(
(example) => example.prompt === prompt
);

return ( <section className="space-y-5">
{/* Header */} <div className="flex items-start justify-between gap-4"> <div className="flex items-start gap-3"> <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/15 bg-accent/10 shadow-sm"> <WandSparkles className="h-4 w-4 text-accent" /> </div>

```
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black tracking-tight text-ink">
            Build your website
          </h2>

          <span className="hidden rounded-full bg-accent/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-accent sm:inline-flex">
            AI
          </span>
        </div>

        <p className="mt-0.5 text-[10px] font-medium leading-4 text-ink/40">
          Describe your idea and let AI turn it into a website.
        </p>
      </div>
    </div>

    <div className="hidden items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1.5 sm:flex">
      <Sparkles className="h-3 w-3 text-teal" />
      <span className="text-[9px] font-bold uppercase tracking-wider text-ink/45">
        AI Powered
      </span>
    </div>
  </div>

  <form onSubmit={onSubmit} className="space-y-3">
    {/* Prompt Editor */}
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-paper shadow-sm transition-all duration-200 ${
        working
          ? "border-line opacity-80"
          : "border-line hover:border-ink/15 focus-within:border-accent/50 focus-within:shadow-md focus-within:ring-4 focus-within:ring-accent/5"
      }`}
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-ink/15" />
            <span className="h-1.5 w-1.5 rounded-full bg-ink/15" />
            <span className="h-1.5 w-1.5 rounded-full bg-ink/15" />
          </div>

          <span className="text-[9px] font-bold uppercase tracking-wider text-ink/30">
            Website prompt
          </span>
        </div>

        {selectedExample && (
          <div className="flex items-center gap-1 text-accent">
            <Check className="h-3 w-3" />
            <span className="text-[9px] font-bold">Example selected</span>
          </div>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Tell us what you want to build... e.g. a modern portfolio with dark mode, animations, projects, skills and a contact form."
        maxLength={MAX_CHARACTERS}
        required
        disabled={working}
        aria-label="Website generation prompt"
        className="min-h-[150px] w-full resize-none bg-transparent px-4 py-4 pb-10 text-sm leading-6 text-ink outline-none placeholder:text-ink/30 disabled:cursor-not-allowed disabled:opacity-60"
      />

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-line/50 bg-paper/80 px-3.5 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-ink/30">
          <Sparkles className="h-3 w-3" />
          <span className="text-[9px] font-medium">
            Be specific for better results
          </span>
        </div>

        <span
          className={`text-[9px] font-bold tabular-nums ${characterStatus}`}
        >
          {characterCount.toLocaleString()}/{MAX_CHARACTERS.toLocaleString()}
        </span>
      </div>

      {/* Focus Accent */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-accent transition-transform duration-300 group-focus-within:scale-x-100" />
    </div>

    {/* Generate Button */}
    <Button
      type="submit"
      variant="accent"
      disabled={working || !prompt.trim()}
      className="group relative h-11 w-full overflow-hidden rounded-xl font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="relative z-10 flex items-center justify-center">
        {working ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating your website...
          </>
        ) : (
          <>
            <Bot className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
            Generate Website
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </>
        )}
      </span>

      {!working && prompt.trim() && (
        <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full" />
      )}
    </Button>
  </form>

  {/* Examples */}
  <div className="space-y-2.5 pt-1">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/45">
          Quick start
        </p>
        <p className="mt-0.5 text-[9px] font-medium text-ink/30">
          Start with a ready-made idea
        </p>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-1">
        <Clock3 className="h-3 w-3 text-ink/30" />
        <span className="text-[8px] font-bold text-ink/35">
          One click
        </span>
      </div>
    </div>

    <div className="grid gap-2">
      {EXAMPLE_PROMPTS.map((example) => {
        const isSelected = prompt === example.prompt;

        return (
          <button
            key={example.title}
            type="button"
            onClick={() => setPrompt(example.prompt)}
            disabled={working}
            aria-label={`Use ${example.title} example`}
            className={`group relative w-full overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 ${
              isSelected
                ? "border-accent/30 bg-accent/[0.06] shadow-sm"
                : "border-line/70 bg-paper hover:-translate-y-0.5 hover:border-accent/20 hover:bg-black/[0.018] hover:shadow-sm"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black ${
                      isSelected ? "text-accent" : "text-ink/70"
                    }`}
                  >
                    {example.title}
                  </span>

                  {isSelected && (
                    <span className="flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wide text-accent">
                      <Check className="h-2.5 w-2.5" />
                      Selected
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-[9px] font-semibold text-ink/35">
                  {example.description}
                </p>

                <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-ink/45">
                  {example.prompt}
                </p>
              </div>

              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                  isSelected
                    ? "bg-accent/10 text-accent"
                    : "bg-black/[0.025] text-ink/25 group-hover:bg-accent/10 group-hover:text-accent"
                }`}
              >
                {isSelected ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                )}
              </div>
            </div>

            {/* Selected indicator */}
            <div
              className={`absolute bottom-0 left-0 h-0.5 bg-accent transition-all duration-300 ${
                isSelected ? "w-full" : "w-0 group-hover:w-1/3"
              }`}
            />
          </button>
        );
      })}
    </div>
  </div>
</section>

);
}
