import type {
  GeneratedSitePayload,
  QAResult,
  WebsitePlan,
} from "@sitecraft/ml";

/* =========================================================
   Primitive / Common Types
========================================================= */

export type ID = string;
export type ISODateString = string;

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

export type ChatMessageRole =
  | "user"
  | "assistant"
  | "system";

export type ActivityType =
  | "user"
  | "project"
  | "generation"
  | "deployment"
  | "website";

/* =========================================================
   JSON Types
========================================================= */

export type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = {
  [key: string]: JsonValue;
};

/* =========================================================
   User
========================================================= */

export interface UserRecord {
  id: ID;
  name?: string | null;
  email: string;
  image?: string | null;
  role: UserRole;

  createdAt: ISODateString;
  updatedAt: ISODateString;

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
  id: ID;
  projectId: ID;

  title: string;
  description: string;
  theme: string;

  colorPalette: WebsitePlan["colorPalette"];
  fontFamily: string;

  structure: WebsitePlan;
  generatedCode: GeneratedSitePayload;

  version: number;

  createdAt: ISODateString;
  updatedAt: ISODateString;

  qa?: QAResult;
  pagesCount?: number;
}

/* =========================================================
   Website Page
========================================================= */

export interface WebsitePageRecord {
  id: ID;
  websiteId: ID;

  name: string;
  slug: string;
  pageType: string;

  content: JsonValue;
  generatedCode?: string | null;

  order: number;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* =========================================================
   Deployment
========================================================= */

export interface DeploymentRecord {
  id: ID;
  projectId: ID;

  projectName?: string;

  userId?: ID;
  userEmail?: string;

  provider: string;

  deploymentUrl?: string;
  deploymentId?: string;

  status: DeploymentStatus;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* =========================================================
   API Usage
========================================================= */

export interface ApiUsageRecord {
  id: ID;
  userId: ID;

  userEmail?: string;
  userName?: string;

  provider: string;
  model?: string;

  tokens?: number;
  estimatedCost?: number;

  createdAt: ISODateString;
}

/* =========================================================
   Generation
========================================================= */

export interface GenerationRecord {
  id: ID;

  projectId?: ID;
  projectName?: string;

  userId?: ID;
  userEmail?: string;

  agent: string;
  userPrompt: string;

  status: GenerationStatus;

  input?: JsonValue;
  output?: JsonValue;
  error?: string;

  tokenUsage?: number;
  durationMs?: number;

  createdAt: ISODateString;
}

/* =========================================================
   Chat
========================================================= */

export interface ChatMessageRecord {
  id: ID;

  projectId?: ID;
  projectName?: string;

  userId?: ID;
  userEmail?: string;

  role: ChatMessageRole;
  content: string;

  createdAt: ISODateString;
}

/* =========================================================
   Project
========================================================= */

export interface ProjectRecord {
  id: ID;
  userId: ID;

  userEmail?: string;
  userName?: string;

  name: string;
  description: string;
  initialPrompt: string;

  status: ProjectStatus;
  framework: string;

  createdAt: ISODateString;
  updatedAt: ISODateString;

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
  id: ID;

  adminUserId: ID;

  adminEmail?: string;
  adminName?: string;

  action: string;

  targetType: string;
  targetId: ID;

  metadata?: Record<string, JsonValue>;

  createdAt: ISODateString;
}

/* =========================================================
   Admin Statistics
========================================================= */

export interface GrowthPoint {
  date: ISODateString;
  count: number;
}

export interface GenerationTimelinePoint {
  date: ISODateString;

  success: number;
  failed: number;
  running: number;
}

export interface AgentUsageStat {
  agent: string;
  count: number;
  percentage: number;
}

export interface ProviderDistributionStat {
  provider: string;

  count: number;
  tokens: number;
  estimatedCost: number;
}

export interface ModelDistributionStat {
  model: string;

  count: number;
  tokens: number;
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

  userGrowth: GrowthPoint[];
  projectGrowth: GrowthPoint[];

  generationTimeline: GenerationTimelinePoint[];

  agentUsage: AgentUsageStat[];

  providerDistribution: ProviderDistributionStat[];
  modelDistribution: ModelDistributionStat[];
}

/* =========================================================
   Recent Activity
========================================================= */

export interface RecentActivityItem {
  id: ID;

  type: ActivityType;

  title: string;
  subtitle: string;
  status: string;

  timestamp: ISODateString;

  userId?: ID;
  userEmail?: string;

  projectId?: ID;
  projectName?: string;

  metadata?: Record<string, JsonValue>;
}

/* =========================================================
   Pagination
========================================================= */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface RequiredPagination {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];

  total: number;

  page: number;
  pageSize: number;
  totalPages: number;
}

/* =========================================================
   Date Range
========================================================= */

export interface DateRangeFilter {
  from?: ISODateString;
  to?: ISODateString;
}

/* =========================================================
   Filters
========================================================= */

export interface ProjectFilter {
  userId?: ID;
  status?: ProjectStatus;
  search?: string;
}

export interface GenerationFilter {
  userId?: ID;
  projectId?: ID;

  agent?: string;
  status?: GenerationStatus;

  provider?: string;
  model?: string;

  search?: string;
}

export interface DeploymentFilter {
  userId?: ID;
  projectId?: ID;

  provider?: string;
  status?: DeploymentStatus;
}

export interface UsageFilter {
  userId?: ID;
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
   API Response Types
========================================================= */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;

  error: string;
  code?: string;
  details?: JsonValue;
  requestId?: string;
}

export type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

/* =========================================================
   Generation Metadata
========================================================= */

export interface GenerationMetadata {
  provider?: string;
  model?: string;

  tokens?: number;
  durationMs?: number;

  startedAt?: ISODateString;
  completedAt?: ISODateString;
}

/* =========================================================
   AI Provider Metadata
========================================================= */

export interface AIProviderMetadata {
  provider: string;
  model?: string;

  tokens?: number;
  estimatedCost?: number;

  requestId?: string;

  startedAt?: ISODateString;
  completedAt?: ISODateString;

  durationMs?: number;
}

/* =========================================================
   Deployment Result
========================================================= */

export interface DeploymentResult {
  id: ID;

  provider: string;

  url?: string;
  deploymentId?: string;

  status: DeploymentStatus;

  error?: string;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* =========================================================
   API Usage Summary
========================================================= */

export interface ApiUsageSummary {
  provider: string;
  model?: string;

  requestCount: number;
  totalTokens: number;
  estimatedCost: number;
}

/* =========================================================
   Project Summary
========================================================= */

export interface ProjectSummary {
  id: ID;

  name: string;
  description: string;

  status: ProjectStatus;
  framework: string;

  websitesCount: number;
  generationsCount: number;
  messagesCount: number;
  deploymentsCount: number;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* =========================================================
   Generation Summary
========================================================= */

export interface GenerationSummary {
  id: ID;

  projectId?: ID;
  projectName?: string;

  agent: string;
  status: GenerationStatus;

  provider?: string;
  model?: string;

  tokenUsage?: number;
  durationMs?: number;

  createdAt: ISODateString;
}

/* =========================================================
   Deployment Summary
========================================================= */

export interface DeploymentSummary {
  id: ID;

  projectId: ID;
  projectName?: string;

  provider: string;
  status: DeploymentStatus;

  deploymentUrl?: string;
  deploymentId?: string;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}