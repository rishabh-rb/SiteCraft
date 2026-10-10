"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

import type { ComponentType } from "react";
import type {
  GeneratedWebsite,
  GenerationStep,
} from "@/lib/api";

interface GenerationProgressProps {
  generations: GenerationStep[];
  website?: GeneratedWebsite;
  working: boolean;
}

type AgentStatus = "completed" | "running" | "pending";

interface AgentMeta {
  label: string;
  shortLabel: string;
  description: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
}

const PIPELINE_AGENTS = [
  "planner",
  "content",
  "ui-designer",
  "code",
  "qa",
] as const;

const AGENT_META: Record<string, AgentMeta> = {
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
    detail: "Generating React and Tailwind code",
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

const FALLBACK_AGENT: AgentMeta = {
  label: "AI Agent",
  shortLabel: "Agent",
  description: "Processes part of the website generation workflow.",
  detail: "Processing the current task",
  icon: Sparkles,
};

function getAgentMeta(agentKey: string): AgentMeta {
  return (
    AGENT_META[agentKey] ?? {
      ...FALLBACK_AGENT,
      label: agentKey,
      shortLabel: agentKey,
    }
  );
}

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

function getLanguage(path: string): string {
  const fileName = getFileName(path);
  const dotIndex = fileName.lastIndexOf(".");
  const extension =
    dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";

  const languages: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TSX",
    js: "JavaScript",
    jsx: "JSX",
    mjs: "JavaScript",
    cjs: "JavaScript",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
    htm: "HTML",
    json: "JSON",
    md: "Markdown",
    mdx: "MDX",
    py: "Python",
    sql: "SQL",
    yaml: "YAML",
    yml: "YAML",
    svg: "SVG",
    xml: "XML",
  };

  return languages[extension] ?? "Code";
}

function formatDuration(duration: unknown): string | null {
  if (typeof duration === "number" && Number.isFinite(duration)) {
    return duration >= 1000
      ? `${(duration / 1000).toFixed(1)}s`
      : `${Math.round(duration)}ms`;
  }

  if (typeof duration === "string" && duration.trim()) {
    return duration.trim();
  }

  return null;
}

function getStatus(
  step: GenerationStep | undefined,
  index: number,
  generationsByAgent: Map<string, GenerationStep>,
  working: boolean
): AgentStatus {
  if (step?.status === "completed") {
    return "completed";
  }

  if (step?.status === "started") {
    return "running";
  }

  if (!working) {
    return "pending";
  }

  const previousAgents = PIPELINE_AGENTS.slice(0, index);

  const previousStagesCompleted = previousAgents.every(
    (agent) => generationsByAgent.get(agent)?.status === "completed"
  );

  return previousStagesCompleted ? "running" : "pending";
}

function safeSerialize(value: unknown): string {
  try {
    const result = JSON.stringify(value, null, 2);
    return result ?? String(value);
  } catch {
    return String(value);
  }
}

function getOutput(
  agentKey: string,
  website?: GeneratedWebsite,
  step?: GenerationStep
): unknown {
  switch (agentKey) {
    case "planner":
      return website?.plan ?? step?.output ?? null;

    case "content":
      if (website?.plan) {
        return {
          heroTitle: website.plan.siteName,
          description: website.plan.siteDescription,
          features: website.plan.features,
        };
      }
      return step?.output ?? null;

    case "ui-designer":
      if (website?.plan) {
        return {
          theme: website.plan.theme,
          colorPalette: website.plan.colorPalette,
          fontFamily: website.plan.fontFamily,
        };
      }
      return step?.output ?? null;

    case "code":
      if (website?.files) {
        return {
          fileCount: website.files.length,
          files: website.files.map((file) => file.path),
        };
      }
      return step?.output ?? null;

    case "qa":
      return website?.qa ?? step?.output ?? null;

    default:
      return step?.output ?? null;
  }
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, string> = {
    completed:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    running: "border-teal/20 bg-teal/10 text-teal",
    pending: "border-line bg-ink/[0.025] text-ink/35",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${styles[status]}`}
    >
      {status === "completed" ? (
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      ) : status === "running" ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <Clock3 className="h-2.5 w-2.5" />
      )}

      {status === "completed"
        ? "Done"
        : status === "running"
          ? "Running"
          : "Waiting"}
    </span>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/[0.04]">
        <Icon className="h-3.5 w-3.5 text-ink/50" />
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-ink/60">
          {title}
        </p>
        <p className="mt-0.5 truncate text-[8px] text-ink/40">
          {description}
        </p>
      </div>
    </div>
  );
}

export function GenerationProgress({
  generations,
  website,
  working,
}: GenerationProgressProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyErrorId, setCopyErrorId] = useState<string | null>(null);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const generationsByAgent = useMemo(() => {
    const map = new Map<string, GenerationStep>();

    for (const generation of generations) {
      map.set(generation.agent, generation);
    }

    return map;
  }, [generations]);

  const pipeline = useMemo(
    () =>
      PIPELINE_AGENTS.map((agentKey, index) => {
        const stepGen = generationsByAgent.get(agentKey);

        return {
          agentKey,
          index,
          stepGen,
          status: getStatus(
            stepGen,
            index,
            generationsByAgent,
            working
          ),
        };
      }),
    [generationsByAgent, working]
  );

  const completedCount = pipeline.filter(
    (item) => item.status === "completed"
  ).length;

  const progressPercentage = Math.round(
    (completedCount / PIPELINE_AGENTS.length) * 100
  );

  const currentAgent = pipeline.find(
    (item) => item.status === "running"
  );

  const hasStarted = generations.length > 0 || Boolean(website);

  const isComplete =
    !working &&
    Boolean(website) &&
    completedCount === PIPELINE_AGENTS.length;

  const websiteFiles = website?.files ?? [];
  const qa = website?.qa;
  const qaScore = Math.min(100, Math.max(0, qa?.score ?? 0));
  const qaIssues = qa?.issues ?? [];

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearCopyTimer();
  }, [clearCopyTimer]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((previous) => (previous === id ? null : id));
  }, []);

  const copyOutput = useCallback(
    async (agentKey: string, output: unknown) => {
      if (output == null) return;

      clearCopyTimer();

      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard API unavailable");
        }

        await navigator.clipboard.writeText(safeSerialize(output));

        setCopiedId(agentKey);
        setCopyErrorId(null);

        copyTimerRef.current = setTimeout(() => {
          setCopiedId((current) =>
            current === agentKey ? null : current
          );
          copyTimerRef.current = null;
        }, 1600);
      } catch {
        setCopiedId(null);
        setCopyErrorId(agentKey);

        copyTimerRef.current = setTimeout(() => {
          setCopyErrorId((current) =>
            current === agentKey ? null : current
          );
          copyTimerRef.current = null;
        }, 2200);
      }
    },
    [clearCopyTimer]
  );

  return (
    <section
      className="overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
      aria-label="AI generation progress"
    >
      {/* Header */}
      <div className="border-b border-line bg-paper px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal/15 bg-teal/[0.08]">
              {working && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 animate-ping rounded-xl bg-teal/10"
                />
              )}
              <Sparkles className="relative h-5 w-5 text-teal" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-black tracking-tight text-ink">
                  AI Generation Pipeline
                </h3>

                {working && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/15 bg-teal/5 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider text-teal">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-teal" />
                    Live
                  </span>
                )}

                {isComplete && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[7px] font-black uppercase tracking-wider text-emerald-700">
                    <Check className="h-2.5 w-2.5" />
                    Complete
                  </span>
                )}
              </div>

              <p className="mt-1 text-[9px] text-ink/45">
                {working
                  ? "Multiple AI agents are working together"
                  : isComplete
                    ? "All generation stages have finished"
                    : hasStarted
                      ? "Generation process status"
                      : "Multi-agent website generation workflow"}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="flex items-end justify-end gap-1">
              <span className="text-base font-black leading-none text-ink">
                {completedCount}
              </span>
              <span className="mb-px text-[10px] font-semibold text-ink/30">
                / {PIPELINE_AGENTS.length}
              </span>
            </div>
            <p className="mt-1 text-[7px] font-bold uppercase tracking-wider text-ink/35">
              Stages
            </p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-[8px] font-bold uppercase tracking-wider text-ink/40">
                Pipeline
              </span>

              {currentAgent && (
                <span className="truncate text-[8px] font-semibold text-teal">
                  {getAgentMeta(currentAgent.agentKey).shortLabel}
                </span>
              )}
            </div>

            <span className="text-[9px] font-black text-teal">
              {progressPercentage}%
            </span>
          </div>

          <div
            className="relative h-1.5 overflow-hidden rounded-full bg-ink/[0.06]"
            role="progressbar"
            aria-label="Generation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercentage}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal to-teal/70 transition-[width] duration-700 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />

            {working && (
              <div className="absolute inset-y-0 left-0 w-20 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-1" aria-hidden="true">
            {pipeline.map((item) => (
              <div
                key={item.agentKey}
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
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

        {/* Active agent */}
        {working && currentAgent && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-teal/15 bg-teal/[0.035] px-3 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal/10">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-teal" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-black text-teal">
                {getAgentMeta(currentAgent.agentKey).label}
              </p>
              <p className="mt-0.5 truncate text-[8px] text-ink/40">
                {getAgentMeta(currentAgent.agentKey).detail}
              </p>
            </div>

            <Zap className="h-3.5 w-3.5 shrink-0 text-teal/50" />
          </div>
        )}
      </div>

      {/* Agent pipeline */}
      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="space-y-2">
          {pipeline.map(({ agentKey, index, stepGen, status }) => {
            const meta = getAgentMeta(agentKey);
            const Icon = meta.icon;
            const isExpanded = expandedId === agentKey;
            const output = getOutput(agentKey, website, stepGen);
            const hasOutput = output !== null && output !== undefined;
            const duration = formatDuration(stepGen?.duration);
            const outputId = `agent-output-${agentKey}`;

            return (
              <article
                key={agentKey}
                className={`relative overflow-hidden rounded-xl border transition-colors duration-200 ${
                  status === "running"
                    ? "border-teal/25 bg-teal/[0.025] shadow-[0_4px_20px_rgba(20,184,166,0.06)]"
                    : status === "completed"
                      ? "border-line bg-paper"
                      : "border-line bg-ink/[0.012]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(agentKey)}
                  aria-expanded={isExpanded}
                  aria-controls={outputId}
                  className="group flex w-full items-center gap-3 p-3 text-left outline-none transition-colors hover:bg-ink/[0.025] focus-visible:ring-2 focus-visible:ring-teal/30 focus-visible:ring-inset sm:p-3.5"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[9px] font-black transition-colors ${
                      status === "completed"
                        ? "border-teal/20 bg-teal/10 text-teal"
                        : status === "running"
                          ? "border-teal/20 bg-teal text-white shadow-[0_0_0_4px_rgba(20,184,166,0.08)]"
                          : "border-line bg-paper text-ink/30"
                    }`}
                  >
                    {status === "running" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : status === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div
                    className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex ${
                      status === "running"
                        ? "bg-teal/10 text-teal"
                        : status === "completed"
                          ? "bg-ink/[0.04] text-ink/50"
                          : "bg-ink/[0.03] text-ink/30"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p
                        className={`truncate text-[10px] font-black sm:text-[11px] ${
                          status === "running"
                            ? "text-teal"
                            : status === "completed"
                              ? "text-ink"
                              : "text-ink/60"
                        }`}
                      >
                        {meta.label}
                      </p>

                      {duration && status === "completed" && (
                        <span className="hidden shrink-0 items-center gap-1 text-[8px] text-ink/35 md:inline-flex">
                          <Clock3 className="h-2.5 w-2.5" />
                          {duration}
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 hidden truncate text-[8px] leading-4 text-ink/40 sm:block">
                      {meta.description}
                    </p>

                    <p
                      className={`mt-0.5 truncate text-[8px] sm:hidden ${
                        status === "running"
                          ? "text-teal/70"
                          : "text-ink/40"
                      }`}
                    >
                      {status === "running"
                        ? meta.detail
                        : meta.shortLabel}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusBadge status={status} />

                    <span className="flex h-6 w-6 items-center justify-center rounded-md transition-colors group-hover:bg-ink/[0.04]">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-ink/40" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-ink/30 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </span>
                  </div>
                </button>

                {/* Agent output */}
                {isExpanded && (
                  <div
                    id={outputId}
                    className="border-t border-line"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-[#101010] px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal/10">
                          <Terminal className="h-2.5 w-2.5 text-teal" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[8px] font-black uppercase tracking-wider text-white/70">
                            Agent Output
                          </p>
                          <p className="truncate font-mono text-[7px] text-white/30">
                            {agentKey}
                          </p>
                        </div>
                      </div>

                      {hasOutput && (
                        <button
                          type="button"
                          onClick={() => void copyOutput(agentKey, output)}
                          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[8px] font-bold text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
                          aria-label={`Copy ${meta.label} output`}
                        >
                          {copiedId === agentKey ? (
                            <>
                              <Check className="h-3 w-3 text-teal" />
                              Copied
                            </>
                          ) : copyErrorId === agentKey ? (
                            <>
                              <AlertTriangle className="h-3 w-3 text-rose-400" />
                              Failed
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-auto bg-[#0b0b0b]">
                      {hasOutput ? (
                        <>
                          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/[0.04] bg-[#0b0b0b]/95 px-3 py-1.5 backdrop-blur">
                            <CircleDot className="h-2.5 w-2.5 text-teal/70" />
                            <span className="font-mono text-[7px] text-white/30">
                              output.json
                            </span>
                          </div>

                          <pre className="whitespace-pre-wrap break-words px-3 py-3 font-mono text-[9px] leading-[1.7] text-white/65">
                            {safeSerialize(output)}
                          </pre>
                        </>
                      ) : (
                        <div className="flex min-h-24 items-center justify-center px-4">
                          <div className="text-center">
                            {status === "running" ? (
                              <Loader2 className="mx-auto h-4 w-4 animate-spin text-teal/60" />
                            ) : (
                              <Clock3 className="mx-auto h-4 w-4 text-white/20" />
                            )}

                            <p className="mt-2 text-[8px] text-white/35">
                              {status === "running"
                                ? "Agent is processing. Output will appear when available."
                                : "No output available for this stage yet."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Generated project files */}
      {websiteFiles.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <SectionHeading
            icon={FileCode2}
            title="Generated Project"
            description={`${websiteFiles.length} source files generated`}
          />

          <div className="mt-3 flex max-h-24 flex-wrap gap-1.5 overflow-auto">
            {websiteFiles.slice(0, 8).map((file) => (
              <div
                key={file.path}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-ink/[0.02] px-2 py-1.5"
                title={file.path}
              >
                <FileText className="h-2.5 w-2.5 shrink-0 text-ink/35" />
                <span className="max-w-[150px] truncate font-mono text-[8px] text-ink/55">
                  {getFileName(file.path)}
                </span>
                <span className="hidden text-[7px] text-ink/30 sm:inline">
                  {getLanguage(file.path)}
                </span>
              </div>
            ))}

            {websiteFiles.length > 8 && (
              <span className="inline-flex items-center rounded-md bg-ink/[0.03] px-2 py-1.5 text-[8px] font-bold text-ink/40">
                +{websiteFiles.length - 8} more
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="text-[8px] text-ink/40">
              Project structure
            </span>
            <span className="inline-flex items-center gap-1.5 text-[8px] font-semibold text-ink/45">
              <Layers3 className="h-3 w-3" />
              {websiteFiles.length} files
            </span>
          </div>
        </div>
      )}

      {/* QA summary */}
      {qa && (
        <div className="border-t border-line px-4 py-3 sm:px-5">
          <div
            className={`overflow-hidden rounded-xl border ${
              qa.passed
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-amber-200 bg-amber-50/60"
            }`}
          >
            <div className="flex items-center justify-between gap-4 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    qa.passed ? "bg-emerald-100" : "bg-amber-100"
                  }`}
                >
                  <ShieldCheck
                    className={`h-4 w-4 ${
                      qa.passed ? "text-emerald-600" : "text-amber-600"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        qa.passed ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      QA Verification
                    </p>

                    {qa.passed && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-[8px] text-ink/45">
                    Quality and accessibility assessment
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className={`text-xl font-black leading-none ${
                    qa.passed ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {qaScore}
                </span>
                <span className="ml-0.5 text-[8px] font-bold text-ink/35">
                  /100
                </span>
              </div>
            </div>

            <div className="px-3.5 pb-3">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"
                role="progressbar"
                aria-label="QA score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={qaScore}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ${
                    qa.passed ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${qaScore}%` }}
                />
              </div>
            </div>

            <div
              className={`flex items-center gap-2 border-t px-3.5 py-2.5 ${
                qa.passed
                  ? "border-emerald-200/70"
                  : "border-amber-200/70"
              }`}
            >
              {qa.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              )}

              <span
                className={`text-[8px] font-bold ${
                  qa.passed ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {qa.passed
                  ? "All quality checks passed successfully"
                  : "Some checks require attention"}
              </span>
            </div>

            {qaIssues.length > 0 && (
              <div className="border-t border-black/[0.05] px-3.5 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  <p className="text-[8px] font-black uppercase tracking-wider text-ink/45">
                    Issues detected
                  </p>
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[7px] font-bold text-amber-700">
                    {qaIssues.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {qaIssues.map((issue, index) => (
                    <div
                      key={`${issue.message}-${index}`}
                      className="flex items-start gap-2 rounded-lg border border-black/[0.03] bg-white/50 px-2.5 py-2"
                    >
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />

                      <p className="min-w-0 break-words text-[9px] leading-4 text-ink/65">
                        <span className="mr-1.5 inline-block rounded bg-amber-100 px-1 py-0.5 text-[7px] font-black uppercase text-amber-700">
                          {issue.severity}
                        </span>
                        {issue.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Waiting state */}
      {!hasStarted && (
        <div className="border-t border-line px-4 py-8">
          <div className="mx-auto max-w-xs text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-ink/[0.04]">
              <Sparkles className="h-4 w-4 text-ink/30" />
            </div>

            <p className="mt-3 text-[10px] font-bold text-ink/50">
              Waiting for generation
            </p>

            <p className="mt-1 text-[8px] leading-4 text-ink/35">
              Your AI agents will appear here as soon as the generation
              process begins.
            </p>
          </div>
        </div>
      )}

      {/* Completion state */}
      {isComplete && (
        <div className="border-t border-emerald-200/60 bg-emerald-50/50 px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />
            </div>

            <span className="text-center text-[8px] font-black uppercase tracking-wider text-emerald-700">
              Website generated successfully
            </span>
          </div>
        </div>
      )}
    </section>
  );
}