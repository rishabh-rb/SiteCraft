"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Code2, Download, Eye, Loader2, RefreshCcw, Sparkles, Rocket, Globe, ExternalLink, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Project } from "@/lib/api";
import { PromptInput } from "@/components/builder/PromptInput";
import { ChatPanel } from "@/components/builder/ChatPanel";
import { GenerationProgress } from "@/components/builder/GenerationProgress";
import { PreviewPanel } from "@/components/builder/PreviewPanel";
import { CodePanel } from "@/components/builder/CodePanel";

type CenterTab = "preview" | "agent-outputs" | "code";

export default function BuilderPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/login");
    }
  });

  const rawProjectId = params.projectId;
  const [projectId, setProjectId] = useState(rawProjectId);
  const [project, setProject] = useState<Project | null>(null);
  const [prompt, setPrompt] = useState("");
  const [chatText, setChatText] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [activeTab, setActiveTab] = useState<CenterTab>("preview");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployModal, setDeployModal] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; deploymentUrl?: string; error?: string } | null>(null);
  const [error, setError] = useState("");

  const website = project?.websites[0]?.generatedCode;
  const files = useMemo(() => website?.files ?? [], [website]);

  async function load(id: string) {
    setLoading(true);
    setError("");
    try {
      const loaded = await api.getProject(id);
      setProject(loaded);
      setPrompt(loaded.initialPrompt || "Create a modern portfolio website with hero, about, projects, and contact form.");
      if (loaded.websites[0]?.generatedCode?.files?.[0]?.path) {
        setSelectedFile(loaded.websites[0].generatedCode.files[0].path);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load project.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      if (rawProjectId === "demo") {
        setLoading(true);
        try {
          const demo = await api.createProject({
            name: "Demo Restaurant",
            description: "A generated demo project for SiteCraft AI.",
            initialPrompt: "Create a modern restaurant website with culinary dining atmosphere, signature menu highlights, customer reviews, and a reservation contact form."
          });
          setProjectId(demo.id);
          router.replace(`/builder/${demo.id}`);
          await load(demo.id);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Failed to initialize demo project.");
          setLoading(false);
        }
        return;
      }
      await load(rawProjectId);
    }

    void bootstrap();
  }, [rawProjectId, router]);

  if (status === "loading" || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper text-ink">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink/70">
          <Loader2 className="h-5 w-5 animate-spin text-accent" /> Loading SiteCraft AI Builder...
        </div>
      </main>
    );
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) return;
    setWorking(true);
    setError("");
    try {
      await api.generate(projectId, prompt);
      await load(projectId);
      setActiveTab("preview");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setWorking(false);
    }
  }

  async function revise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatText.trim()) return;
    setWorking(true);
    setError("");
    const revision = chatText;
    setChatText("");
    try {
      await api.revise(projectId, revision);
      await load(projectId);
      setActiveTab("preview");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revision failed.");
    } finally {
      setWorking(false);
    }
  }

  async function deploy() {
    setDeploying(true);
    setDeployModal(true);
    setDeployResult(null);
    try {
      const res = await api.deploy(projectId, "vercel");
      setDeployResult({ success: true, deploymentUrl: res.deploymentUrl });
    } catch (caught) {
      setDeployResult({
        success: false,
        error: caught instanceof Error ? caught.message : "Deployment could not be completed."
      });
    } finally {
      setDeploying(false);
    }
  }

  async function exportZip() {
    setWorking(true);
    setError("");
    try {
      const blob = await api.exportProject(projectId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project?.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "sitecraft-site"}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#ede7dc] text-ink">
      {/* Builder Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line hover:bg-black/5" title="Back to dashboard">
            <ArrowLeft className="h-4 w-4 text-ink" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-ink">{project?.name || "Untitled Project"}</p>
            <p className="truncate text-xs text-ink/60">
              Status: <span className="font-semibold capitalize text-accent">{project?.status || "draft"}</span> · {website?.plan?.siteName || "No website generated"}
            </p>
          </div>
        </div>

        {/* Center Tab Switcher for Main Canvas View */}
        <div className="hidden md:flex items-center bg-paper p-1 rounded-lg border border-line">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === "preview" ? "bg-ink text-white shadow-sm" : "text-ink/70 hover:bg-black/5"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Live Preview
          </button>
          <button
            onClick={() => setActiveTab("agent-outputs")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === "agent-outputs" ? "bg-ink text-white shadow-sm" : "text-ink/70 hover:bg-black/5"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Agent Outputs ({project?.generations?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all ${
              activeTab === "code" ? "bg-ink text-white shadow-sm" : "text-ink/70 hover:bg-black/5"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" /> Code ({files.length})
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 px-3" onClick={() => void load(projectId)} title="Refresh Project">
            <RefreshCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="h-9 px-3 font-bold text-teal border-teal/30 hover:bg-teal/5"
            onClick={deploy}
            disabled={!website || working || deploying}
            title="Deploy generated site"
          >
            <Rocket className="h-4 w-4 mr-1" /> Deploy
          </Button>

          <Button variant="accent" className="h-9 px-3 font-bold" onClick={exportZip} disabled={!website || working}>
            <Download className="h-4 w-4 mr-1" /> Download ZIP
          </Button>
        </div>
      </header>

      {error ? <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div> : null}

      {/* 3-Panel Main Workspace Grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)_380px]">
        {/* LEFT PANEL: Prompt Input & Conversational Edits */}
        <aside className="panel-scroll min-h-0 resize-x overflow-auto border-r border-line bg-white p-4 space-y-6">
          <PromptInput prompt={prompt} setPrompt={setPrompt} onSubmit={generate} working={working} />
          <ChatPanel
            messages={project?.messages ?? []}
            chatText={chatText}
            setChatText={setChatText}
            onSubmit={revise}
            working={working}
            disabled={!website}
          />
        </aside>

        {/* CENTER PANEL: Live Website Preview OR Multi-Agent Output Pipeline View */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          {activeTab === "preview" && <PreviewPanel website={website} working={working} />}
          {activeTab === "agent-outputs" && (
            <div className="panel-scroll min-h-0 flex-1 overflow-auto p-5 bg-paper">
              <GenerationProgress generations={project?.generations ?? []} website={website} working={working} />
            </div>
          )}
          {activeTab === "code" && (
            <div className="min-h-0 flex-1 overflow-hidden">
              <CodePanel website={website} selectedFile={selectedFile} onSelectFile={setSelectedFile} />
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Code Viewer & File Explorer (Always accessible on wide screens) */}
        <div className="hidden lg:block min-h-0 overflow-hidden">
          <CodePanel website={website} selectedFile={selectedFile} onSelectFile={setSelectedFile} />
        </div>
      </div>

      {/* Deployment Modal */}
      {deployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-black text-ink">Cloud Deployment</h3>
              </div>
              <button
                onClick={() => setDeployModal(false)}
                className="rounded p-1 text-ink/60 hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              {deploying ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="mt-3 text-sm font-bold text-ink">Packaging & deploying to Vercel...</p>
                  <p className="mt-1 text-xs text-ink/60">Building static output bundle</p>
                </div>
              ) : deployResult?.success ? (
                <div className="py-4 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                  <h4 className="mt-3 text-lg font-black text-ink">Deployment Successful!</h4>
                  <p className="mt-1 text-xs text-ink/65">Your website is live on the cloud.</p>
                  {deployResult.deploymentUrl && (
                    <a
                      href={deployResult.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      <Globe className="h-4 w-4" /> Visit Live Website <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="py-4 text-left">
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">Vercel Deployment Notice</p>
                      <p className="mt-1 text-xs leading-5">
                        {deployResult?.error || "Vercel deployment is not configured. Add VERCEL_TOKEN to .env to enable instant cloud deployments."}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-ink/60 leading-5">
                    You can always download the complete project as a ZIP package with <code className="bg-black/5 px-1 py-0.5 rounded font-mono">package.json</code> and run it locally with <code className="bg-black/5 px-1 py-0.5 rounded font-mono">npm install && npm run dev</code>.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-line pt-3">
              <Button variant="outline" onClick={() => setDeployModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
