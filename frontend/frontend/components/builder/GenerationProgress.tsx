"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  Copy,
  FileCode2,
  FileText,
  Layers3,
  Layout,
  Loader2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
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

/* =========================================================
   Agent metadata
========================================================= */

const AGENT_META: Record<
  string,
  {
    label: string;
    shortLabel: string;
    description: string;
    detail: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  planner: {
    label: "Planner Agent",
    shortLabel: "Planning",
    description:
      "Analyzes the prompt and creates the site structure, pages, theme, and feature roadmap.",
    detail: "Understanding requirements and building the project blueprint",
    icon: Sparkles,
  },

  content: {
    label: "Content Agent",
    shortLabel: "Content",
    description:
      "Generates headlines, descriptions, features, testimonials, and SEO-ready content.",
    detail: "Creating polished website content and copy",
    icon: FileText,
  },

  "ui-designer": {
    label: "UI Designer Agent",
    shortLabel: "UI Design",
    description:
      "Creates the layout system, component hierarchy, typography, and design tokens.",
    detail: "Designing the visual system and component structure",
    icon: Layout,
  },

  code: {
    label: "Code Generation Agent",
    shortLabel: "Code",
    description:
      "Builds React components, Tailwind styles, and the generated project file structure.",
    detail: "Generating production-ready React and Tailwind code",
    icon: Code2,
  },

  qa: {
    label: "QA Agent",
    shortLabel: "QA",
    description:
      "Checks responsiveness, accessibility, SEO, broken links, and generated output quality.",
    detail: "Running quality, accessibility, and consistency checks",
    icon: ShieldCheck,
  },
};

const PIPELINE_AGENTS = [
  "planner",
  "content",
  "ui-designer",
  "code",
  "qa",
];

/* =========================================================
   Helpers
========================================================= */

function getStatus(
  stepGen?: GenerationStep,
  index = 0,
  generations: GenerationStep[] = [],
  working = false
): "completed" | "running" | "pending" {
  if (stepGen?.status === "completed") {
    return "completed";
  }

  if (stepGen?.status === "started") {
    return "running";
  }

  if (!working) {
    return stepGen?.status === "completed"
      ? "completed"
      : "pending";
  }

  const previousAgents = PIPELINE_AGENTS.slice(0, index);

  const allPreviousCompleted = previousAgents.every((agent) => {
    const generation = generations.find(
      (item) => item.agent === agent
    );

    return generation?.status === "completed";
  });

  if (
    allPreviousCompleted &&
    (!stepGen || stepGen.status !== "completed")
  ) {
    return "running";
  }

  return "pending";
}

function getFileName(path: string) {
  return path.split("/").pop() || path;
}

function getLanguage(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();

  const languages: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TSX",
    js: "JavaScript",
    jsx: "JSX",
    css: "CSS",
    html: "HTML",
    json: "JSON",
    md: "Markdown",
  };

  return languages[extension || ""] || "Code";
}

/* =========================================================
   Status badge
========================================================= */

function StatusBadge({
  status,
}: {
  status: "completed" | "running" | "pending";
}) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-emerald-700">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
        Done
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-teal">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        Running
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink/[0.025] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-ink/30">
      <Clock3 className="h-2.5 w-2.5" />
      Waiting
    </span>
  );
}

/* =========================================================
   Main component
========================================================= */

export function GenerationProgress({
  generations,
  website,
  working,
}: GenerationProgressProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* -------------------------------------------------------
     Pipeline state
  ------------------------------------------------------- */

  const pipeline = useMemo(() => {
    return PIPELINE_AGENTS.map((agentKey, index) => {
      const stepGen = generations.find(
        (generation) => generation.agent === agentKey
      );

      const status = getStatus(
        stepGen,
        index,
        generations,
        working
      );

      return {
        agentKey,
        index,
        stepGen,
        status,
      };
    });
  }, [generations, working]);

  const completedCount = pipeline.filter(
    (item) => item.status === "completed"
  ).length;

  const runningCount = pipeline.filter(
    (item) => item.status === "running"
  ).length;

  const progressPercentage = Math.round(
    (completedCount / PIPELINE_AGENTS.length) * 100
  );

  const currentAgent = pipeline.find(
    (item) => item.status === "running"
  );

  /* -------------------------------------------------------
     Overall state
  ------------------------------------------------------- */

  const isComplete =
    !working &&
    Boolean(website) &&
    completedCount === PIPELINE_AGENTS.length;

  const hasStarted =
    generations.length > 0 || Boolean(website);

  /* -------------------------------------------------------
     Toggle output
  ------------------------------------------------------- */

  const toggleExpand = (id: string) => {
    setExpandedId((previous) =>
      previous === id ? null : id
    );
  };

  /* -------------------------------------------------------
     Agent output
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     Copy output
  ------------------------------------------------------- */

  const copyOutput = async (
    agentKey: string,
    output: unknown
  ) => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(output, null, 2)
      );

      setCopiedId(agentKey);

      window.setTimeout(() => {
        setCopiedId((current) =>
          current === agentKey ? null : current
        );
      }, 1600);
    } catch {
      // Clipboard may be unavailable.
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_8px_30px_rgba(15,23,42,0.05)]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="border-b border-line bg-paper px-4 py-4 sm:px-5">

        <div className="flex items-start justify-between gap-4">

          {/* Title */}
          <div className="flex min-w-0 items-center gap-3">

            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal/15 bg-teal/[0.08]">

              {working && (
                <span className="absolute inset-0 animate-ping rounded-xl bg-teal/10" />
              )}

              <Sparkles className="relative h-4.5 w-4.5 text-teal" />
            </div>

            <div className="min-w-0">

              <div className="flex items-center gap-2">

                <h3 className="truncate text-sm font-black tracking-tight text-ink">
                  AI Generation Pipeline
                </h3>

                {working && (
                  <span className="hidden items-center gap-1.5 rounded-full border border-teal/15 bg-teal/5 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-teal sm:inline-flex">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-teal" />
                    Live
                  </span>
                )}

                {isComplete && (
                  <span className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-emerald-700 sm:inline-flex">
                    <Check className="h-2.5 w-2.5" />
                    Complete
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-[9px] text-ink/40">
                {working
                  ? "Multiple AI agents are working together"
                  : isComplete
                  ? "All generation stages have finished"
                  : "Multi-agent website generation workflow"}
              </p>

            </div>
          </div>

          {/* Progress counter */}
          <div className="shrink-0 text-right">

            <div className="flex items-end justify-end gap-1">

              <span className="text-base font-black leading-none text-ink">
                {completedCount}
              </span>

              <span className="mb-px text-[10px] font-semibold text-ink/25">
                / {PIPELINE_AGENTS.length}
              </span>

            </div>

            <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.14em] text-ink/30">
              Stages
            </p>

          </div>
        </div>

        {/* =================================================
            Progress
        ================================================= */}

        <div className="mt-5">

          <div className="mb-2 flex items-center justify-between">

            <div className="flex items-center gap-2">

              <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink/35">
                Pipeline
              </span>

              {runningCount > 0 && (
                <span className="text-[8px] font-semibold text-teal">
                  {AGENT_META[
                    currentAgent?.agentKey || ""
                  ]?.shortLabel ?? "Processing"}
                </span>
              )}

            </div>

            <span className="text-[9px] font-black text-teal">
              {progressPercentage}%
            </span>

          </div>

          <div className="relative h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">

            <div
              className="h-full rounded-full bg-gradient-to-r from-teal to-teal/70 transition-all duration-700 ease-out"
              style={{
                width: `${progressPercentage}%`,
              }}
            />

            {working && (
              <div className="absolute inset-y-0 left-0 w-20 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            )}

          </div>

          {/* Mini stage indicators */}
          <div className="mt-2.5 flex items-center gap-1">

            {pipeline.map((item) => (
              <div
                key={item.agentKey}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  item.status === "completed"
                    ? "bg-teal"
                    : item.status === "running"
                    ? "animate-pulse bg-teal/50"
                    : "bg-ink/[0.08]"
                }`}
              />
            ))}

          </div>
        </div>

        {/* =================================================
            Current agent
        ================================================= */}

        {working && currentAgent && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-teal/15 bg-teal/[0.035] px-3 py-2.5">

            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal/10">

              <Loader2 className="h-3.5 w-3.5 animate-spin text-teal" />

            </div>

            <div className="min-w-0 flex-1">

              <div className="flex items-center gap-2">

                <p className="truncate text-[9px] font-black text-teal">
                  {AGENT_META[
                    currentAgent.agentKey
                  ]?.label ?? currentAgent.agentKey}
                </p>

                <span className="hidden text-[8px] text-ink/25 sm:inline">
                  •
                </span>

                <p className="hidden truncate text-[8px] text-ink/40 sm:block">
                  {AGENT_META[
                    currentAgent.agentKey
                  ]?.detail}
                </p>

              </div>

              <p className="mt-0.5 truncate text-[8px] text-ink/35">
                Processing current stage...
              </p>

            </div>

            <Zap className="h-3.5 w-3.5 shrink-0 text-teal/40" />

          </div>
        )}
      </div>

      {/* =====================================================
          PIPELINE
      ===================================================== */}

      <div className="px-3 py-3 sm:px-4 sm:py-4">

        <div className="space-y-1">

          {pipeline.map(
            ({
              agentKey,
              index,
              stepGen,
              status,
            }) => {

              const meta =
                AGENT_META[agentKey] ?? {
                  label: agentKey,
                  shortLabel: agentKey,
                  description: "",
                  detail: "",
                  icon: Sparkles,
                };

              const Icon = meta.icon;

              const itemId =
                stepGen?.id || agentKey;

              const isExpanded =
                expandedId === itemId;

              const output =
                getAgentOutput(
                  agentKey,
                  stepGen
                );

              const isLast =
                index ===
                PIPELINE_AGENTS.length - 1;

              return (
                <div
                  key={agentKey}
                  className="relative"
                >

                  {/* Connector */}
                  {!isLast && (
                    <div
                      className={`absolute left-[17px] top-[45px] z-0 h-[calc(100%-24px)] w-px transition-colors duration-500 ${
                        status === "completed"
                          ? "bg-teal/30"
                          : "bg-ink/[0.08]"
                      }`}
                    />
                  )}

                  {/* =================================================
                      Agent Card
                  ================================================= */}

                  <div
                    className={`relative z-10 overflow-hidden rounded-xl border transition-all duration-300 ${
                      status === "running"
                        ? "border-teal/25 bg-teal/[0.025] shadow-[0_4px_20px_rgba(20,184,166,0.07)]"
                        : status === "completed"
                        ? "border-line bg-paper"
                        : "border-line bg-ink/[0.012]"
                    }`}
                  >

                    <button
                      type="button"
                      onClick={() =>
                        toggleExpand(itemId)
                      }
                      className="group flex w-full items-center gap-3 p-3 text-left outline-none transition-colors hover:bg-ink/[0.025] focus-visible:ring-2 focus-visible:ring-teal/20 focus-visible:ring-inset sm:p-3.5"
                      aria-expanded={isExpanded}
                      aria-label={`View ${meta.label} details`}
                    >

                      {/* Step indicator */}

                      <div
                        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[9px] font-black transition-all duration-300 ${
                          status === "completed"
                            ? "border-teal/20 bg-teal/10 text-teal"
                            : status === "running"
                            ? "border-teal/20 bg-teal text-white shadow-[0_0_0_4px_rgba(20,184,166,0.08)]"
                            : "border-line bg-paper text-ink/25"
                        }`}
                      >

                        {status ===
                        "running" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : status ===
                          "completed" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          index + 1
                        )}

                      </div>

                      {/* Agent icon */}

                      <div
                        className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex ${
                          status === "running"
                            ? "bg-teal/10 text-teal"
                            : status ===
                              "completed"
                            ? "bg-ink/[0.04] text-ink/45"
                            : "bg-ink/[0.03] text-ink/25"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      {/* Text */}

                      <div className="min-w-0 flex-1">

                        <div className="flex min-w-0 items-center gap-2">

                          <p
                            className={`truncate text-[10px] font-black sm:text-[11px] ${
                              status === "running"
                                ? "text-teal"
                                : status ===
                                  "completed"
                                ? "text-ink"
                                : "text-ink/55"
                            }`}
                          >
                            {meta.label}
                          </p>

                          {status ===
                            "completed" &&
                            stepGen?.duration && (
                              <span className="hidden shrink-0 items-center gap-1 text-[7px] font-medium text-ink/25 md:flex">
                                <Clock3 className="h-2.5 w-2.5" />
                                {stepGen.duration}
                              </span>
                            )}

                        </div>

                        <p className="mt-0.5 hidden truncate text-[8px] leading-4 text-ink/35 sm:block">
                          {meta.description}
                        </p>

                        <p
                          className={`mt-0.5 text-[8px] sm:hidden ${
                            status === "running"
                              ? "text-teal/60"
                              : "text-ink/30"
                          }`}
                        >
                          {status === "running"
                            ? meta.detail
                            : meta.shortLabel}
                        </p>

                      </div>

                      {/* Status */}

                      <div className="flex shrink-0 items-center gap-1.5">

                        <StatusBadge
                          status={status}
                        />

                        <span className="flex h-6 w-6 items-center justify-center rounded-md transition-colors group-hover:bg-ink/[0.04]">

                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-ink/35" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-ink/25 transition-transform group-hover:translate-x-0.5" />
                          )}

                        </span>

                      </div>
                    </button>

                    {/* =================================================
                        OUTPUT
                    ================================================= */}

                    {isExpanded && (
                      <div className="border-t border-line">

                        {/* Output header */}

                        <div className="flex items-center justify-between border-b border-white/5 bg-[#101010] px-3 py-2.5">

                          <div className="flex min-w-0 items-center gap-2">

                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal/10">

                              <Terminal className="h-2.5 w-2.5 text-teal" />

                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-[8px] font-black uppercase tracking-[0.12em] text-white/65">
                                Agent Output
                              </p>

                              <p className="truncate font-mono text-[7px] text-white/25">
                                {agentKey}
                              </p>

                            </div>

                          </div>

                          {output && (
                            <button
                              type="button"
                              onClick={() =>
                                copyOutput(
                                  agentKey,
                                  output
                                )
                              }
                              className="inline-flex h-6 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[7px] font-bold text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white/75"
                              aria-label="Copy agent output"
                            >
                              {copiedId ===
                              agentKey ? (
                                <>
                                  <Check className="h-2.5 w-2.5 text-teal" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-2.5 w-2.5" />
                                  Copy
                                </>
                              )}
                            </button>
                          )}

                        </div>

                        {/* Output body */}

                        <div className="max-h-72 overflow-auto bg-[#0b0b0b]">

                          {output ? (
                            <div className="relative">

                              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/[0.04] bg-[#0b0b0b]/95 px-3 py-1.5 backdrop-blur">

                                <CircleDot className="h-2.5 w-2.5 text-teal/70" />

                                <span className="font-mono text-[7px] text-white/25">
                                  output.json
                                </span>

                              </div>

                              <pre className="whitespace-pre-wrap break-words px-3 py-3 font-mono text-[8px] leading-[1.7] text-white/60">
                                {JSON.stringify(
                                  output,
                                  null,
                                  2
                                )}
                              </pre>

                            </div>
                          ) : (
                            <div className="flex min-h-24 items-center justify-center px-4">

                              <div className="text-center">

                                <Clock3 className="mx-auto h-4 w-4 text-white/15" />

                                <p className="mt-2 text-[8px] text-white/30">
                                  Output will appear once this agent completes.
                                </p>

                              </div>

                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}

        </div>
      </div>

      {/* =====================================================
          GENERATED FILE SUMMARY
      ===================================================== */}

      {website?.files?.length ? (
        <div className="border-t border-line px-4 py-3">

          <div className="flex items-center justify-between gap-3">

            <div className="flex min-w-0 items-center gap-2.5">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/[0.04]">

                <FileCode2 className="h-3.5 w-3.5 text-ink/45" />

              </div>

              <div className="min-w-0">

                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-ink/55">
                  Generated Project
                </p>

                <p className="mt-0.5 text-[8px] text-ink/35">
                  {website.files.length} files generated
                </p>

              </div>

            </div>

            <div className="flex items-center gap-1.5">

              <span className="rounded-full bg-teal/10 px-2 py-1 font-mono text-[8px] font-bold text-teal">
                {website.files.length}
              </span>

              <Layers3 className="h-3.5 w-3.5 text-ink/20" />

            </div>

          </div>

          {/* File chips */}

          <div className="mt-3 flex max-h-20 flex-wrap gap-1.5 overflow-auto">

            {website.files
              .slice(0, 8)
              .map((file) => (
                <div
                  key={file.path}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-ink/[0.02] px-2 py-1"
                  title={file.path}
                >
                  <FileText className="h-2.5 w-2.5 shrink-0 text-ink/25" />

                  <span className="max-w-[150px] truncate font-mono text-[7px] text-ink/45">
                    {getFileName(file.path)}
                  </span>

                  <span className="hidden text-[7px] text-ink/20 sm:inline">
                    {getLanguage(file.path)}
                  </span>
                </div>
              ))}

            {website.files.length > 8 && (
              <span className="inline-flex items-center rounded-md bg-ink/[0.03] px-2 py-1 text-[7px] font-bold text-ink/30">
                +{website.files.length - 8} more
              </span>
            )}

          </div>
        </div>
      ) : null}

      {/* =====================================================
          QA SUMMARY
      ===================================================== */}

      {website?.qa && (
        <div className="border-t border-line px-4 py-3 sm:px-5">

          <div
            className={`overflow-hidden rounded-xl border ${
              website.qa.passed
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-amber-200 bg-amber-50/60"
            }`}
          >

            {/* QA Header */}

            <div className="flex items-center justify-between gap-4 px-3.5 py-3">

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

                  <div className="flex items-center gap-2">

                    <p
                      className={`text-[10px] font-black uppercase tracking-[0.1em] ${
                        website.qa.passed
                          ? "text-emerald-800"
                          : "text-amber-800"
                      }`}
                    >
                      QA Verification
                    </p>

                    {website.qa.passed && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    )}

                  </div>

                  <p className="mt-0.5 truncate text-[8px] text-ink/40">
                    Quality and accessibility assessment
                  </p>

                </div>

              </div>

              {/* Score */}

              <div className="shrink-0 text-right">

                <div className="flex items-baseline justify-end gap-0.5">

                  <span
                    className={`text-xl font-black leading-none ${
                      website.qa.passed
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {website.qa.score}
                  </span>

                  <span className="text-[8px] font-bold text-ink/25">
                    /100
                  </span>

                </div>

              </div>
            </div>

            {/* Score bar */}

            <div className="px-3.5 pb-3">

              <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">

                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    website.qa.passed
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      Math.max(
                        website.qa.score,
                        0
                      ),
                      100
                    )}%`,
                  }}
                />

              </div>

            </div>

            {/* Result */}

            <div
              className={`flex items-center gap-2 border-t px-3.5 py-2.5 ${
                website.qa.passed
                  ? "border-emerald-200/70"
                  : "border-amber-200/70"
              }`}
            >

              {website.qa.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              )}

              <span
                className={`text-[8px] font-bold ${
                  website.qa.passed
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >
                {website.qa.passed
                  ? "All quality checks passed successfully"
                  : "Some checks require attention"}
              </span>

            </div>

            {/* Issues */}

            {website.qa.issues?.length ? (
              <div className="border-t border-black/[0.05] px-3.5 py-3">

                <div className="mb-2 flex items-center gap-2">

                  <AlertTriangle className="h-3 w-3 text-amber-600" />

                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-ink/40">
                    Issues detected
                  </p>

                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[7px] font-bold text-amber-700">
                    {website.qa.issues.length}
                  </span>

                </div>

                <div className="space-y-1.5">

                  {website.qa.issues.map(
                    (issue, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 rounded-lg border border-black/[0.03] bg-white/50 px-2.5 py-2"
                      >

                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />

                        <p className="min-w-0 text-[8px] leading-4 text-ink/60">

                          <span className="mr-1.5 rounded bg-amber-100 px-1 py-0.5 text-[6px] font-black uppercase tracking-wide text-amber-700">
                            {issue.severity}
                          </span>

                          {issue.message}

                        </p>

                      </div>
                    )
                  )}

                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* =====================================================
          EMPTY / START STATE
      ===================================================== */}

      {!hasStarted && (
        <div className="border-t border-line px-4 py-8">

          <div className="mx-auto max-w-xs text-center">

            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-ink/[0.04]">

              <Sparkles className="h-4 w-4 text-ink/25" />

            </div>

            <p className="mt-3 text-[10px] font-bold text-ink/45">
              Waiting for generation
            </p>

            <p className="mt-1 text-[8px] leading-4 text-ink/25">
              Your AI agents will appear here as soon as the generation process begins.
            </p>

          </div>
        </div>
      )}

      {/* =====================================================
          COMPLETED STATE
      ===================================================== */}

      {isComplete && (
        <div className="border-t border-emerald-200/60 bg-emerald-50/50 px-4 py-3">

          <div className="flex items-center justify-center gap-2">

            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">

              <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />

            </div>

            <span className="text-[8px] font-black uppercase tracking-[0.08em] text-emerald-700">
              Website generated successfully
            </span>

          </div>

        </div>
      )}

    </section>
  );
}