
import type {
  GeneratedSitePayload,
  QAResult,
  WebsitePlan,
} from "@sitecraft/ml";

/* =========================================================
   Common Types
========================================================= */

export type UserRole = "USER" | "ADMIN";

export type ProjectStatus =
  | "draft"
  | "generating"
  | "ready"
  | "failed";

export type DeploymentStatus =
  | "PENDING"
  | "BUILDING"
  | "READY"
  | "ERROR";

export type GenerationStatus =
  | "started"
  | "completed"
  | "failed"
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED";

export type ChatMessageRole = "user" | "assistant" | "system";

export type ActivityType =
  | "user"
  | "project"
  | "generation"
  | "deployment"
  | "website";

/* =========================================================
   User
========================================================= */

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
  websitesCount?: number;
  deploymentsCount?: number;

  tokensUsed?: number;
  estimatedCost?: number;
}

/* =========================================================
   Website
========================================================= */

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

/* =========================================================
   Website Page
========================================================= */

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

/* =========================================================
   Deployment
========================================================= */

export interface DeploymentRecord {
  id: string;
  projectId: string;

  projectName?: string;

  userId?: string;
  userEmail?: string;

  provider: string;

  deploymentUrl?: string;
  deploymentId?: string;

  status: DeploymentStatus;

  createdAt: string;
  updatedAt: string;
}

/* =========================================================
   API Usage
========================================================= */

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

/* =========================================================
   Generation
========================================================= */

export interface GenerationRecord {
  id: string;

  projectId?: string;
  projectName?: string;

  userId?: string;
  userEmail?: string;

  agent: string;
  userPrompt: string;

  status: GenerationStatus;

  input?: unknown;
  output?: unknown;
  error?: string;

  tokenUsage?: number;
  durationMs?: number;

  createdAt: string;
}

/* =========================================================
   Chat
========================================================= */

export interface ChatMessageRecord {
  id: string;

  projectId?: string;
  projectName?: string;

  userId?: string;
  userEmail?: string;

  role: ChatMessageRole;

  content: string;

  createdAt: string;
}

/* =========================================================
   Project
========================================================= */

export interface ProjectRecord {
  id: string;

  userId: string;

  userEmail?: string;
  userName?: string;

  name: string;
  description: string;
  initialPrompt: string;

  status: ProjectStatus;

  framework: string;

  createdAt: string;
  updatedAt: string;

  websites: WebsiteRecord[];
  generations: GenerationRecord[];
  messages: ChatMessageRecord[];

  deployments?: DeploymentRecord[];

  websitesCount?: number;
  generationsCount?: number;
  messagesCount?: number;
  deploymentsCount?: number;
}

/* =========================================================
   Admin Audit Logs
========================================================= */

export interface AdminAuditLogRecord {
  id: string;

  adminUserId: string;
  adminEmail?: string;
  adminName?: string;

  action: string;

  targetType: string;
  targetId: string;

  metadata?: Record<string, unknown>;

  createdAt: string;
}

/* =========================================================
   Admin Statistics
========================================================= */

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

  userGrowth: Array<{
    date: string;
    count: number;
  }>;

  projectGrowth: Array<{
    date: string;
    count: number;
  }>;

  generationTimeline: Array<{
    date: string;
    success: number;
    failed: number;
    running: number;
  }>;

  agentUsage: Array<{
    agent: string;
    count: number;
    percentage: number;
  }>;

  providerDistribution: Array<{
    provider: string;
    count: number;
    tokens: number;
    estimatedCost: number;
  }>;

  modelDistribution: Array<{
    model: string;
    count: number;
    tokens: number;
  }>;
}

/* =========================================================
   Recent Activity
========================================================= */

export interface RecentActivityItem {
  id: string;

  type: ActivityType;

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

/* =========================================================
   Pagination
========================================================= */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];

  total: number;

  page: number;
  pageSize: number;
  totalPages: number;
}

/* =========================================================
   Common Filters
========================================================= */

export interface DateRangeFilter {
  from?: string;
  to?: string;
}

export interface ProjectFilter {
  userId?: string;
  status?: ProjectStatus;
  search?: string;
}

export interface GenerationFilter {
  userId?: string;
  projectId?: string;
  agent?: string;
  status?: GenerationStatus;
  provider?: string;
  model?: string;
  search?: string;
}

export interface DeploymentFilter {
  userId?: string;
  projectId?: string;
  provider?: string;
  status?: DeploymentStatus;
}

export interface UsageFilter {
  userId?: string;
  provider?: string;
  model?: string;
}

/* =========================================================
   Store Data
========================================================= */

export interface StoreData {
  users?: UserRecord[];

  projects: ProjectRecord[];

  deployments?: DeploymentRecord[];

  apiUsage?: ApiUsageRecord[];

  auditLogs?: AdminAuditLogRecord[];
}

/* =========================================================
   Admin Query Types
========================================================= */

export interface AdminListParams
  extends PaginationParams,
    DateRangeFilter {
  search?: string;
}

export interface AdminProjectListParams
  extends PaginationParams,
    DateRangeFilter,
    ProjectFilter {}

export interface AdminGenerationListParams
  extends PaginationParams,
    DateRangeFilter,
    GenerationFilter {}

export interface AdminDeploymentListParams
  extends PaginationParams,
    DateRangeFilter,
    DeploymentFilter {}

export interface AdminUsageListParams
  extends PaginationParams,
    DateRangeFilter,
    UsageFilter {}

/* =========================================================
   API Response Helpers
========================================================= */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

/* =========================================================
   Generation / AI Metadata
========================================================= */

export interface GenerationMetadata {
  provider?: string;
  model?: string;

  tokens?: number;
  durationMs?: number;

  startedAt?: string;
  completedAt?: string;
}

/* =========================================================
   Deployment Result
========================================================= */

export interface DeploymentResult {
  id: string;
  provider: string;

  url?: string;
  deploymentId?: string;

  status: DeploymentStatus;

  error?: string;

  createdAt: string;
  updatedAt: string;
}
