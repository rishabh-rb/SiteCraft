"use client";

import { FormEvent } from "react";
import { Bot, Loader2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptInputProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  working: boolean;
}

const EXAMPLE_PROMPTS = [
  "Modern portfolio for a software engineer with dark mode, blue/purple accents, skills, projects & contact form.",
  "SaaS landing page for an AI code assistant with hero, features grid, pricing table, and testimonials.",
  "Boutique cafe & restaurant website with menu highlights, seasonal specials, store location & reservation form."
];

export function PromptInput({ prompt, setPrompt, onSubmit, working }: PromptInputProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <WandSparkles className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-black tracking-normal text-ink">Prompt</h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          className="min-h-36 w-full resize-y rounded-md border border-line bg-paper px-3 py-3 text-sm leading-6 outline-none focus:border-accent text-ink"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your ideal website structure, theme, colors, and content sections..."
          maxLength={3000}
          required
        />
        <Button type="submit" variant="accent" className="w-full font-bold" disabled={working}>
          {working ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Bot className="h-4 w-4 mr-1" />} Generate Website
        </Button>
      </form>

      <div className="space-y-1.5 pt-2">
        <p className="text-xs font-bold uppercase text-ink/50">Example Prompts</p>
        <div className="space-y-1">
          {EXAMPLE_PROMPTS.map((example, idx) => (
            <button
              key={idx}
              type="button"
              className="text-left w-full text-xs text-ink/70 hover:text-accent hover:bg-black/5 p-1.5 rounded transition-all line-clamp-2"
              onClick={() => setPrompt(example)}
            >
              • {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
