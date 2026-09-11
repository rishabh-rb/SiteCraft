export type GeneratedFile = {
  path: string;
  language: string;
  content: string;
};

export type GeneratedWebsite = {
  html: string;
  files: GeneratedFile[];
  plan: {
    siteName: string;
    siteDescription: string;
    pages: Array<{ name: string; slug: string; pageType: string; sections: string[] }>;
    theme: string;
    colorPalette: Record<string, string>;
    fontFamily: string;
    features: string[];
  };
  qa?: {
    passed: boolean;
    score: number;
    issues: Array<{ severity: "error" | "warning" | "info"; message: string; file?: string }>;
  };
};

export type ChatMessage = {
  id: string;
  projectId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type GenerationStep = {
  id: string;
  agent: string;
  userPrompt: string;
  status: "started" | "completed" | "failed";
  input?: unknown;
  output?: unknown;
  error?: string;
  createdAt: string;
};

export type Deployment = {
  id: string;
  projectId: string;
  provider: string;
  deploymentUrl?: string;
  deploymentId?: string;
  status: "PENDING" | "BUILDING" | "READY" | "ERROR";
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  userId?: string;
  name: string;
  description: string;
  initialPrompt: string;
  status: "draft" | "generating" | "ready" | "failed";
  framework: string;
  createdAt: string;
  updatedAt: string;
  websites: Array<{
    id: string;
    title: string;
    description: string;
    theme: string;
    generatedCode: GeneratedWebsite;
    version: number;
  }>;
  generations: GenerationStep[];
  messages: ChatMessage[];
  deployments?: Deployment[];
};

export type ConfigStatus = {
  gemini: boolean;
  openai: boolean;
  nvidia: boolean;
  bynara: boolean;
  database: boolean;
  auth: boolean;
  googleOAuth: boolean;
  unsplash: boolean;
  vercel: boolean;
  activeProvider: string;
  activeModel: string;
};

import { getSession } from "next-auth/react";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

type CustomSessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = await getSession();
  const user = session?.user as CustomSessionUser | undefined;
  const userId = user?.email;
  const userRole = user?.role;
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
      ...(userRole ? { "x-user-role": userRole } : {}),
      ...options.headers
    },
    cache: "no-store"
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error?.message || `Request failed with ${response.status}`);
  }
  return data.data as T;
}

export const api = {
  health: () => request<{ service: string; provider: string; model: string; message: string }>("/api/health"),
  getConfigStatus: () => request<ConfigStatus>("/api/config/status"),
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (body: { name: string; description?: string; initialPrompt?: string }) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  deleteProject: (id: string) => request<{ id: string }>(`/api/projects/${id}`, { method: "DELETE" }),
  generate: (projectId: string, prompt: string) =>
    request<{ website: GeneratedWebsite; qa: GeneratedWebsite["qa"]; provider: string }>(`/api/projects/${projectId}/generate`, {
      method: "POST",
      body: JSON.stringify({ prompt })
    }),
  revise: (projectId: string, prompt: string) =>
    request<{ website: GeneratedWebsite; qa: GeneratedWebsite["qa"] }>(`/api/projects/${projectId}/revise`, {
      method: "POST",
      body: JSON.stringify({ prompt })
    }),
  deploy: (projectId: string, provider = "vercel") =>
    request<{ success: boolean; deploymentUrl?: string; deploymentId?: string; provider: string; status: string }>(`/api/projects/${projectId}/deploy`, {
      method: "POST",
      body: JSON.stringify({ provider })
    }),
  exportProject: async (projectId: string) => {
    const session = await getSession();
    const user = session?.user as CustomSessionUser | undefined;
    const headers: Record<string, string> = {};
    if (user?.email) headers["x-user-id"] = user.email;
    if (user?.role) headers["x-user-role"] = user.role;

    const response = await fetch(`${baseUrl}/api/projects/${projectId}/export`, {
      headers,
      cache: "no-store"
    });
    if (!response.ok) throw new Error("ZIP export failed");
    return response.blob();
  }
};
