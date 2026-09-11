"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FolderPlus, Loader2, Trash2, WandSparkles, Settings, Folder, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Project } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/login");
    }
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("Modern Portfolio");
  const [description, setDescription] = useState("A polished website generated from a natural-language prompt.");
  const [initialPrompt, setInitialPrompt] = useState("Create a modern portfolio website for a software engineer with projects, skills, testimonials, and a contact section.");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const stats = useMemo(
    () => [
      ["Total Projects", projects.length],
      ["Generated Websites", projects.filter((project) => project.websites.length > 0).length],
      ["Agent Generations", projects.reduce((sum, project) => sum + project.generations.length, 0)],
      ["Ready Sites", projects.filter((project) => project.status === "ready").length]
    ],
    [projects]
  );

  useEffect(() => {
    let active = true;
    api
      .listProjects()
      .then((loaded) => {
        if (active) setProjects(loaded);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load projects.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper text-ink">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink/70">
          <Loader2 className="h-5 w-5 animate-spin text-accent" /> Loading SiteCraft AI workspace...
        </div>
      </main>
    );
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const project = await api.createProject({ name, description, initialPrompt });
      router.push(`/builder/${project.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Project creation failed.");
      setCreating(false);
    }
  }

  async function deleteProject(id: string) {
    setError("");
    try {
      await api.deleteProject(id);
      setProjects((current) => current.filter((project) => project.id !== id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Delete failed.");
    }
  }

  async function duplicate(project: Project) {
    setError("");
    try {
      const copy = await api.createProject({
        name: `${project.name} Copy`,
        description: project.description,
        initialPrompt: project.initialPrompt
      });
      setProjects((current) => [copy, ...current]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Duplicate failed.");
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Top Header */}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-black tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> SiteCraft AI
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm font-semibold text-ink/70">
              <Link href="/dashboard" className="text-ink font-bold">Dashboard</Link>
              <Link href="/dashboard/projects" className="hover:text-ink">Projects</Link>
              <Link href="/dashboard/settings" className="hover:text-ink">Settings</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-block text-xs font-semibold text-ink/60">
              {session?.user?.email}
            </span>
            <Link href="/dashboard/settings" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line hover:bg-black/5" title="Settings">
              <Settings className="h-4 w-4 text-ink/70" />
            </Link>
            <Link href="/builder/demo" className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-black/5">
              <WandSparkles className="h-3.5 w-3.5 text-accent" /> Demo
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink/70 hover:bg-red-50 hover:text-red-700"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[380px_1fr]">
        {/* Left Card: Create Website Brief */}
        <aside className="h-fit rounded-xl border border-line bg-white p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-accent" />
            <p className="text-xs font-bold uppercase tracking-wider text-teal">New Project Brief</p>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight">Create AI Website</h1>
          <p className="mt-1 text-xs text-ink/60">Describe what you want to build and the multi-agent system will generate it.</p>

          <form onSubmit={createProject} className="mt-6 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
              Project Name
              <input
                className="mt-1.5 h-10 w-full rounded-md border border-line bg-paper px-3 text-sm font-sans text-ink outline-none focus:border-accent"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
              Description (Optional)
              <input
                className="mt-1.5 h-10 w-full rounded-md border border-line bg-paper px-3 text-sm font-sans text-ink outline-none focus:border-accent"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
              Initial Website Prompt
              <textarea
                className="mt-1.5 min-h-32 w-full resize-y rounded-md border border-line bg-paper px-3 py-2.5 text-sm font-sans leading-5 text-ink outline-none focus:border-accent"
                value={initialPrompt}
                onChange={(event) => setInitialPrompt(event.target.value)}
                maxLength={3000}
                required
              />
            </label>
            <Button type="submit" variant="accent" className="w-full font-bold" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />} Launch Builder
            </Button>
          </form>
        </aside>

        {/* Right Section: Stats & Projects */}
        <section className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid gap-3 sm:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-white p-4 shadow-soft">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink/50">{label}</p>
                <p className="mt-1.5 text-3xl font-black text-ink">{value}</p>
              </div>
            ))}
          </div>

          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

          {/* Recent Projects List Header */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Recent Projects</h2>
              <p className="text-xs text-ink/60">Your active websites and generation pipelines</p>
            </div>
            <Link href="/dashboard/projects" className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:underline">
              <Folder className="h-3.5 w-3.5" /> View All Projects ({projects.length})
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink/60">
              <Loader2 className="h-5 w-5 animate-spin text-accent" /> Loading your projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-12 text-center">
              <Folder className="mx-auto h-12 w-12 text-ink/30" />
              <h3 className="mt-3 text-lg font-bold">No projects yet</h3>
              <p className="mt-1 text-xs text-ink/60">Fill out the brief on the left to start generating your first website.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <article key={project.id} className="flex flex-col justify-between rounded-xl border border-line bg-white p-5 shadow-soft transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-black/5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-teal">
                        {project.status}
                      </span>
                      <span className="text-xs text-ink/50">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-black text-ink">{project.name}</h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/65">{project.description || project.initialPrompt}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                    <Link
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-ink px-3 text-xs font-bold text-white transition-all hover:bg-black/80"
                      href={`/builder/${project.id}`}
                    >
                      <WandSparkles className="h-3.5 w-3.5" /> Open Builder
                    </Link>

                    <div className="flex items-center gap-1">
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink/70 hover:bg-black/5"
                        onClick={() => duplicate(project)}
                        title="Duplicate project"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => deleteProject(project.id)}
                        title="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
