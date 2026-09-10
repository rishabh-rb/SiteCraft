import type { GeneratedSitePayload, QAResult, WebsitePlan } from "@sitecraft/ml";

export type UserRole = "USER" | "ADMIN";

export interface UserRecord {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  projectsCount?: number;
  generationsCount?: number;
  tokensUsed?: number;
  estimatedCost?: number;
}

export interface WebsiteRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  theme: string;
  colorPalette: WebsitePlan["colorPalette"];
  fontFamily: string;
  structure: WebsitePlan;
  generatedCode: GeneratedSitePayload;
  version: number;
  createdAt: string;
  updatedAt: string;
  qa?: QAResult;
  pagesCount?: number;
}

export interface WebsitePageRecord {
  id: string;
  websiteId: string;
  name: string;
  slug: string;
  pageType: string;
  content: unknown;
  generatedCode?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentRecord {
  id: string;
  projectId: string;
  projectName?: string;
  userId?: string;
  userEmail?: string;
  provider: string;
  deploymentUrl?: string;
  deploymentId?: string;
  status: "PENDING" | "BUILDING" | "READY" | "ERROR";
  createdAt: string;
  updatedAt: string;
}

export interface ApiUsageRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  provider: string;
  model?: string;
  tokens?: number;
  estimatedCost?: number;
  createdAt: string;
}

export interface GenerationRecord {
  id: string;
  projectId?: string;
  projectName?: string;
  userId?: string;
  userEmail?: string;
  agent: string;
  userPrompt: string;
  status: "started" | "completed" | "failed" | "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  input?: unknown;
  output?: unknown;
  error?: string;
  tokenUsage?: number;
  durationMs?: number;
  createdAt: string;
}

export interface ChatMessageRecord {
  id: string;
  projectId?: string;
  projectName?: string;
  userId?: string;
  userEmail?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  name: string;
  description: string;
  initialPrompt: string;
  status: "draft" | "generating" | "ready" | "failed";
  framework: string;
  createdAt: string;
  updatedAt: string;
  websites: WebsiteRecord[];
  generations: GenerationRecord[];
  messages: ChatMessageRecord[];
  deployments?: DeploymentRecord[];
  websitesCount?: number;
  generationsCount?: number;
}

export interface AdminAuditLogRecord {
  id: string;
  adminUserId: string;
  adminEmail?: string;
  adminName?: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalWebsites: number;
  totalGenerations: number;
  totalTokens: number;
  estimatedCost: number;
  successfulGenerations: number;
  failedGenerations: number;
  runningGenerations: number;
  userGrowth: Array<{ date: string; count: number }>;
  projectGrowth: Array<{ date: string; count: number }>;
  generationTimeline: Array<{ date: string; success: number; failed: number; running: number }>;
  agentUsage: Array<{ agent: string; count: number; percentage: number }>;
  providerDistribution: Array<{ provider: string; count: number; tokens: number; estimatedCost: number }>;
  modelDistribution: Array<{ model: string; count: number; tokens: number }>;
}

export interface RecentActivityItem {
  id: string;
  type: "user" | "project" | "generation" | "deployment" | "website";
  title: string;
  subtitle: string;
  status: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  projectId?: string;
  projectName?: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StoreData {
  users?: UserRecord[];
  projects: ProjectRecord[];
  deployments?: DeploymentRecord[];
  apiUsage?: ApiUsageRecord[];
  auditLogs?: AdminAuditLogRecord[];
}
