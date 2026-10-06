
"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code2,
  FileText,
  Layout,
  Loader2,
  Sparkles,
  ShieldCheck,
  CircleDot,
} from "lucide-react";

import type {
  GeneratedWebsite,
  GenerationStep,
} from "@/lib/api";

interface GenerationProgressProps {
  generations: GenerationStep[];
  website?: GeneratedWebsite;
  working: boolean;
}

/* -------------------------------------------------
   Agent metadata
------------------------------------------------- */
const AGENT_META: Record<
  string,
  {
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  planner: {
    label: "Planner Agent",
    shortLabel: "Planning",
    description:
      "Analyzes the prompt and creates the site structure, pages, theme, and feature roadmap.",
    icon: Sparkles,
  },

  content: {
    label: "Content Agent",
    shortLabel: "Content",
    description:
      "Generates headlines, descriptions, features, testimonials, and SEO-ready content.",
    icon: FileText,
  },

  "ui-designer": {
    label: "UI Designer Agent",
    shortLabel: "UI Design",
    description:
      "Creates the layout system, component hierarchy, typography, and design tokens.",
    icon: Layout,
  },

  code: {
    label: "Code Generation Agent",
    shortLabel: "Code",
    description:
      "Builds React components, Tailwind styles, and the generated project file structure.",
    icon: Code2,
  },

  qa: {
    label: "QA Agent",
    shortLabel: "QA",
    description:
      "Checks responsiveness, accessibility, SEO, broken links, and generated output quality.",
    icon: ShieldCheck,
  },
};

/* -------------------------------------------------
   Pipeline order
------------------------------------------------- */
const PIPELINE_AGENTS = [
  "planner",
  "content",
  "ui-designer",
  "code",
  "qa",
];

/* -------------------------------------------------
   Status badge
------------------------------------------------- */
function StatusBadge({
  status,
}: {
  status: "completed" | "running" | "pending";
}) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Complete
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-teal">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink/[0.03] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-ink/35">
      <Clock3 className="h-3 w-3" />
      Pending
    </span>
  );
}

/* -------------------------------------------------
   Main component
------------------------------------------------- */
export function GenerationProgress({
  generations,
  website,
  working,
}: GenerationProgressProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* -------------------------------------------------
     Calculate pipeline progress
  ------------------------------------------------- */
  const completedCount = useMemo(() => {
    return PIPELINE_AGENTS.filter((agentKey) => {
      const generation = generations.find(
        (item) => item.agent === agentKey
      );

      return (
        generation?.status === "completed" ||
        (Boolean(website) && !working)
      );
    }).length;
  }, [generations, website, working]);

  const progressPercentage = Math.round(
    (completedCount / PIPELINE_AGENTS.length) * 100
  );

  const currentAgent = useMemo(() => {
    if (!working) return null;

    return PIPELINE_AGENTS.find((agentKey) => {
      const generation = generations.find(
        (item) => item.agent === agentKey
      );

      return !generation || generation.status === "started";
    });
  }, [generations, working]);

  const toggleExpand = (id: string) => {
    setExpandedId((previous) =>
      previous === id ? null : id
    );
  };

  /* -------------------------------------------------
     Agent output
  ------------------------------------------------- */
  const getAgentOutput = (
    agentKey: string,
    stepGen?: GenerationStep
  ) => {
    if (agentKey === "planner" && website?.plan) {
      return website.plan;
    }

    if (agentKey === "content" && website?.plan) {
      return {
        heroTitle: website.plan.siteName,
        description: website.plan.siteDescription,
        features: website.plan.features,
      };
    }

    if (agentKey === "ui-designer" && website?.plan) {
      return {
        theme: website.plan.theme,
        colorPalette: website.plan.colorPalette,
        fontFamily: website.plan.fontFamily,
      };
    }

    if (agentKey === "code" && website?.files) {
      return {
        fileCount: website.files.length,
        files: website.files.map((file) => file.path),
      };
    }

    if (agentKey === "qa" && website?.qa) {
      return website.qa;
    }

    return stepGen?.output ?? null;
  };

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-paper shadow-sm">
      {/* =================================================
          HEADER
      ================================================= */}
      <div className="border-b border-line px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/10">
              <Sparkles className="h-4 w-4 text-teal" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-black text-ink">
                  AI Generation Pipeline
                </h3>

                {working && (
                  <span className="hidden rounded-full bg-teal/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-teal sm:inline-flex">
                    Live
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-[10px] text-ink/40">
                Multi-agent website generation workflow
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="shrink-0 text-right">
            <p className="text-xs font-black text-ink">
              {completedCount}/{PIPELINE_AGENTS.length}
            </p>

            <p className="text-[8px] uppercase tracking-wider text-ink/35">
              Agents
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-semibold text-ink/45">
              Pipeline progress
            </span>

            <span className="text-[9px] font-bold text-teal">
              {progressPercentage}%
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
            <div
              className="h-full rounded-full bg-teal transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Active agent */}
        {working && currentAgent && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-teal/15 bg-teal/[0.04] px-2.5 py-2">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-teal" />

            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold text-teal">
                {AGENT_META[currentAgent]?.label ?? currentAgent}
              </p>

              <p className="truncate text-[8px] text-ink/40">
                Currently processing this stage...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =================================================
          PIPELINE
      ================================================= */}
      <div className="px-3 py-3 sm:px-4">
        <div className="space-y-1">
          {PIPELINE_AGENTS.map((agentKey, index) => {
            const meta =
              AGENT_META[agentKey] ?? {
                label: agentKey,
                shortLabel: agentKey,
                description: "",
                icon: Sparkles,
              };

            const Icon = meta.icon;

            const stepGen = generations.find(
              (generation) => generation.agent === agentKey
            );

            const isCompleted =
              stepGen?.status === "completed" ||
              (Boolean(website) && !working);

            const isRunning =
              working &&
              !isCompleted &&
              (!stepGen || stepGen.status === "started");

            const status: "completed" | "running" | "pending" =
              isCompleted
                ? "completed"
                : isRunning
                ? "running"
                : "pending";

            const itemId = stepGen?.id || agentKey;
            const isExpanded = expandedId === itemId;

            const output = getAgentOutput(
              agentKey,
              stepGen
            );

            return (
              <div key={agentKey} className="relative">
                {/* Connector */}
                {index < PIPELINE_AGENTS.length - 1 && (
                  <div
                    className={`absolute left-[17px] top-[42px] z-0 h-[calc(100%-10px)] w-px ${
                      isCompleted
                        ? "bg-teal/30"
                        : "bg-ink/10"
                    }`}
                  />
                )}

                {/* Agent card */}
                <div
                  className={`relative z-10 overflow-hidden rounded-xl border transition-all duration-200 ${
                    isRunning
                      ? "border-teal/25 bg-teal/[0.025] shadow-sm"
                      : isCompleted
                      ? "border-line bg-paper"
                      : "border-line bg-ink/[0.015]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(itemId)}
                    className="group flex w-full items-center gap-3 p-3 text-left outline-none transition-colors hover:bg-ink/[0.025] focus-visible:ring-2 focus-visible:ring-teal/20"
                    aria-expanded={isExpanded}
                  >
                    {/* Step number */}
                    <div
                      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                        isCompleted
                          ? "border-teal/20 bg-teal/10 text-teal"
                          : isRunning
                          ? "border-teal/20 bg-teal text-white"
                          : "border-line bg-paper text-ink/30"
                      }`}
                    >
                      {isRunning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Icon */}
                    <div
                      className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex ${
                        isRunning
                          ? "bg-teal/10 text-teal"
                          : isCompleted
                          ? "bg-ink/[0.04] text-ink/50"
                          : "bg-ink/[0.03] text-ink/30"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate text-[11px] font-bold ${
                            isRunning
                              ? "text-teal"
                              : "text-ink"
                          }`}
                        >
                          {meta.label}
                        </p>
                      </div>

                      <p className="mt-0.5 hidden text-[9px] leading-4 text-ink/40 sm:block">
                        {meta.description}
                      </p>

                      <p className="mt-0.5 text-[8px] text-ink/35 sm:hidden">
                        {meta.shortLabel}
                      </p>
                    </div>

                    {/* Status + arrow */}
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={status} />

                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-ink/30" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-ink/25 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </div>
                  </button>

                  {/* =================================================
                      OUTPUT PANEL
                  ================================================= */}
                  {isExpanded && (
                    <div className="border-t border-line">
                      <div className="flex items-center justify-between border-b border-white/5 bg-[#111] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <CircleDot className="h-3 w-3 text-teal" />

                          <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                            Agent Output
                          </span>
                        </div>

                        <span className="font-mono text-[8px] text-white/25">
                          {agentKey}
                        </span>
                      </div>

                      <div className="max-h-64 overflow-auto bg-[#0d0d0d] p-3">
                        {output ? (
                          <pre className="whitespace-pre-wrap break-words font-mono text-[9px] leading-4 text-white/65">
                            {JSON.stringify(output, null, 2)}
                          </pre>
                        ) : (
                          <div className="flex items-center gap-2 py-4 text-white/30">
                            <Clock3 className="h-3.5 w-3.5" />

                            <span className="font-sans text-[9px] italic">
                              Output will appear once this agent completes.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================================
          QA SUMMARY
      ================================================= */}
      {website?.qa && (
        <div className="border-t border-line px-4 py-3">
          <div
            className={`overflow-hidden rounded-xl border ${
              website.qa.passed
                ? "border-emerald-200 bg-emerald-50/70"
                : "border-amber-200 bg-amber-50/70"
            }`}
          >
            {/* QA Header */}
            <div className="flex items-center justify-between gap-3 px-3 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    website.qa.passed
                      ? "bg-emerald-100"
                      : "bg-amber-100"
                  }`}
                >
                  <ShieldCheck
                    className={`h-4 w-4 ${
                      website.qa.passed
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      website.qa.passed
                        ? "text-emerald-800"
                        : "text-amber-800"
                    }`}
                  >
                    QA Verification
                  </p>

                  <p className="mt-0.5 text-[9px] text-ink/45">
                    Final quality and accessibility assessment
                  </p>
                </div>
              </div>

              {/* Score */}
              <div className="shrink-0 text-right">
                <p
                  className={`text-lg font-black leading-none ${
                    website.qa.passed
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {website.qa.score}
                </p>

                <p className="text-[8px] font-bold uppercase tracking-wide text-ink/35">
                  / 100
                </p>
              </div>
            </div>

            {/* Score bar */}
            <div className="px-3 pb-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
                <div
                  className={`h-full rounded-full transition-all ${
                    website.qa.passed
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      Math.max(website.qa.score, 0),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Result */}
            <div
              className={`flex items-center gap-2 border-t px-3 py-2 ${
                website.qa.passed
                  ? "border-emerald-200/70"
                  : "border-amber-200/70"
              }`}
            >
              {website.qa.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              )}

              <span
                className={`text-[9px] font-bold ${
                  website.qa.passed
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >
                {website.qa.passed
                  ? "All quality checks passed"
                  : "Some checks require attention"}
              </span>
            </div>

            {/* Issues */}
            {website.qa.issues?.length ? (
              <div className="border-t border-black/5 px-3 py-3">
                <p className="mb-2 text-[8px] font-black uppercase tracking-wider text-ink/40">
                  Issues detected
                </p>

                <div className="space-y-1.5">
                  {website.qa.issues.map((issue, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 rounded-lg bg-white/50 px-2.5 py-2"
                    >
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />

                      <p className="min-w-0 text-[9px] leading-4 text-ink/65">
                        <span className="mr-1 font-bold uppercase text-ink/45">
                          {issue.severity}
                        </span>
                        {issue.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* =================================================
          COMPLETED STATE
      ================================================= */}
      {!working && website && (
        <div className="border-t border-line bg-emerald-50/40 px-4 py-2.5">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />

            <span className="text-[9px] font-bold text-emerald-700">
              Website generation completed successfully
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
