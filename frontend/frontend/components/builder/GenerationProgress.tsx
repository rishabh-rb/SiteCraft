"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, Code, FileText, Layout, Loader2, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
import type { GeneratedWebsite, GenerationStep } from "@/lib/api";

interface GenerationProgressProps {
  generations: GenerationStep[];
  website?: GeneratedWebsite;
  working: boolean;
}

const AGENT_META: Record<string, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  planner: {
    label: "Planner Agent",
    description: "Analyzes natural-language prompt into site pages, themes, and feature roadmap",
    icon: Sparkles
  },
  "ui-designer": {
    label: "UI Designer Agent",
    description: "Generates layout system, component hierarchy, typography, and design tokens",
    icon: Layout
  },
  content: {
    label: "Content Agent",
    description: "Generates headlines, value propositions, feature items, testimonials, and SEO metadata",
    icon: FileText
  },
  code: {
    label: "Code Generation Agent",
    description: "Compiles React TSX components, Tailwind CSS styling, and project file structure",
    icon: Code
  },
  qa: {
    label: "QA Agent",
    description: "Validates responsive viewports, ARIA landmarks, broken links, accessibility, and SEO",
    icon: ShieldCheck
  },
  revision: {
    label: "Revision Agent",
    description: "Applies targeted modifications to the website components and color palette",
    icon: Sparkles
  }
};

export function GenerationProgress({ generations, website, working }: GenerationProgressProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Standard multi-agent pipeline order
  const pipelineAgents = ["planner", "content", "ui-designer", "code", "qa"];

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border border-line shadow-sm">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h3 className="font-extrabold text-base text-ink">Multi-Agent Generation Pipeline</h3>
        </div>
        {working && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Orchestrating Agents...
          </span>
        )}
      </div>

      {/* Agents Execution Steps */}
      <div className="space-y-3">
        {pipelineAgents.map((agentKey, index) => {
          const meta = AGENT_META[agentKey] || { label: agentKey, description: "", icon: Sparkles };
          const Icon = meta.icon;
          const stepGen = generations.find((g) => g.agent === agentKey);
          const isCompleted = stepGen?.status === "completed" || (Boolean(website) && !working);
          const isRunning = working && (!stepGen || stepGen.status === "started");
          const isExpanded = expandedId === (stepGen?.id || agentKey);

          return (
            <div key={agentKey} className="rounded-md border border-line bg-paper overflow-hidden transition-all">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/5 select-none"
                onClick={() => toggleExpand(stepGen?.id || agentKey)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/5 text-ink font-bold text-xs">
                    {index + 1}
                  </div>
                  <Icon className="h-4 w-4 text-ink/70" />
                  <div>
                    <p className="text-sm font-bold text-ink">{meta.label}</p>
                    <p className="text-xs text-ink/60">{meta.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                    </span>
                  ) : isRunning ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/30">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink/40 bg-black/5 px-2 py-0.5 rounded">
                      <Clock className="h-3.5 w-3.5" /> Pending
                    </span>
                  )}
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-ink/50" /> : <ChevronRight className="h-4 w-4 text-ink/50" />}
                </div>
              </div>

              {/* Step Output Inspection Panel */}
              {isExpanded && (
                <div className="border-t border-line bg-ink text-white p-3 text-xs font-mono overflow-auto max-h-60">
                  <p className="text-accent font-sans font-bold mb-2">Agent Output Inspection ({agentKey}):</p>
                  {agentKey === "planner" && website?.plan ? (
                    <pre>{JSON.stringify(website.plan, null, 2)}</pre>
                  ) : agentKey === "content" && website?.plan ? (
                    <pre>{JSON.stringify({ heroTitle: website.plan.siteName, description: website.plan.siteDescription, features: website.plan.features }, null, 2)}</pre>
                  ) : agentKey === "ui-designer" && website?.plan ? (
                    <pre>{JSON.stringify({ theme: website.plan.theme, colorPalette: website.plan.colorPalette, fontFamily: website.plan.fontFamily }, null, 2)}</pre>
                  ) : agentKey === "code" && website?.files ? (
                    <pre>{JSON.stringify({ fileCount: website.files.length, files: website.files.map(f => f.path) }, null, 2)}</pre>
                  ) : agentKey === "qa" && website?.qa ? (
                    <pre>{JSON.stringify(website.qa, null, 2)}</pre>
                  ) : stepGen?.output ? (
                    <pre>{JSON.stringify(stepGen.output, null, 2)}</pre>
                  ) : (
                    <p className="text-ink/60 font-sans italic">Output will be displayed once agent completes run.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* QA Assessment Summary Card */}
      {website?.qa && (
        <div className={`p-3 rounded-md border text-xs ${website.qa.passed ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-amber-50 border-amber-200 text-amber-950"}`}>
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> QA Verification Score: {website.qa.score}/100
            </span>
            <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-white border border-black/10">
              {website.qa.passed ? "Passed" : "Needs Revision"}
            </span>
          </div>
          {website.qa.issues?.length ? (
            <ul className="mt-2 space-y-1 pl-4 list-disc font-sans text-ink/75">
              {website.qa.issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                  <span>[{issue.severity.toUpperCase()}] {issue.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
