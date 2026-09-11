"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Folder, Trash2, Copy, WandSparkles, Loader2 } from "lucide-react";
import { api, type Project } from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.listProjects()
      .then((data) => {
        if (active) setProjects(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load projects.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function deleteProj(id: string) {
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function duplicateProj(project: Project) {
    try {
      const copy = await api.createProject({
        name: `${project.name} Copy`,
        description: project.description,
        initialPrompt: project.initialPrompt
      });
      setProjects((prev) => [copy, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duplicate failed.");
    }
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.initialPrompt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-paper px-5 py-10 text-ink">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/70 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90">
            <Plus className="h-4 w-4" /> New Project
          </Link>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Your Projects ({projects.length})</h1>
            <p className="mt-1 text-sm text-ink/65">Manage and edit all your generated websites in one place.</p>
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-3 h-4 w-4 text-ink/40" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-ink/65">
            <Loader2 className="h-5 w-5 animate-spin text-accent" /> Loading your project workspace...
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-line bg-white p-12 text-center">
            <Folder className="mx-auto h-12 w-12 text-ink/30" />
            <h3 className="mt-4 text-lg font-bold">No projects found</h3>
            <p className="mt-1 text-sm text-ink/60">Create your first AI-generated website brief from the dashboard.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
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
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink/65">{project.description || project.initialPrompt}</p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                  <Link
                    href={`/builder/${project.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-black/80"
                  >
                    <WandSparkles className="h-3.5 w-3.5" /> Open Builder
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => duplicateProj(project)}
                      className="rounded p-1.5 text-ink/60 hover:bg-black/5 hover:text-ink"
                      title="Duplicate project"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteProj(project.id)}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                      title="Delete project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
