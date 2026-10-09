import dotenv from "dotenv";
import path from "node:path";
import http from "node:http";
import { URL } from "node:url";
import JSZip from "jszip";
import { z } from "zod";
import { createProvider, ProviderError } from "@sitecraft/ml";

import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  recordDeployment,
  recordApiUsage,
  getUserRole,
  getAdminStats,
  listAdminUsers,
  getAdminUserDetail,
  updateUserRole,
  listAdminProjects,
  getAdminProjectDetail,
  listAdminWebsites,
  getAdminWebsiteDetail,
  listAdminGenerations,
  getAdminGenerationDetail,
  getAdminUsageAnalytics,
  listAdminDeployments,
  listAdminChats,
  getAdminRecentActivity,
  listAdminAuditLogs,
} from "./store.js";

import { createProjectSchema, promptSchema } from "./validators.js";
import { generateProject, reviseProject } from "./orchestrator.js";
import { deployToVercel } from "./deployment/vercel.js";
import { deployToNetlify } from "./deployment/netlify.js";

// -----------------------------------------------------------------------------
// Environment
// -----------------------------------------------------------------------------

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

dotenv.config({
  path: path.resolve(process.cwd(), "../.env"),
});

const port = Number(process.env.BACKEND_PORT || 4000);
const provider = createProvider();

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "http://localhost:3000";

const MAX_BODY_SIZE = 2 * 1024 * 1024;

// -----------------------------------------------------------------------------
// CORS and response helpers
// -----------------------------------------------------------------------------

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
    "Access-Control-Allow-Headers":
      "Content-Type, x-user-id, x-user-role",
    "Access-Control-Allow-Methods":
      "GET, POST, PATCH, DELETE, OPTIONS",
  };
}

function sendJson(
  response: http.ServerResponse,
  status: number,
  body: unknown
): void {
  if (response.headersSent || response.destroyed) {
    return;
  }

  const payload = JSON.stringify(body);

  response.writeHead(status, {
    ...corsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });

  response.end(payload);
}

function sendError(
  response: http.ServerResponse,
  status: number,
  code: string,
  message: string
): void {
  sendJson(response, status, {
    success: false,
    error: {
      code,
      message,
    },
  });
}

// -----------------------------------------------------------------------------
// Request helpers
// -----------------------------------------------------------------------------

async function readBody(
  request: http.IncomingMessage
): Promise<unknown> {
  const contentLength = Number(
    request.headers["content-length"] || 0
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_BODY_SIZE
  ) {
    throw new Error("Request body is too large.");
  }

  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    totalSize += buffer.length;

    if (totalSize > MAX_BODY_SIZE) {
      throw new Error("Request body is too large.");
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function positiveNumber(
  value: string | null,
  fallback: number,
  max = 100
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}

// -----------------------------------------------------------------------------
// ZIP helpers
// -----------------------------------------------------------------------------

function sanitizeZipName(name: string): string {
  const safeName = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return safeName || "sitecraft-site";
}

function sanitizeZipPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    return "";
  }

  const parts = normalized.split("/");

  if (parts.some((part) => part === "..")) {
    return "";
  }

  return parts
    .filter((part) => part && part !== ".")
    .join("/");
}

// -----------------------------------------------------------------------------
// Error handling
// -----------------------------------------------------------------------------

function errorResponse(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof z.ZodError) {
    return {
      code: "INVALID_INPUT",
      message: error.issues[0]?.message || "Invalid input",
    };
  }

  if (error instanceof ProviderError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: "REQUEST_FAILED",
      message: error.message,
    };
  }

  return {
    code: "REQUEST_FAILED",
    message: "Request failed",
  };
}

function errorStatus(error: unknown): number {
  if (error instanceof ProviderError) {
    switch (error.code) {
      case "INVALID_API_KEY":
        return 401;
      case "RATE_LIMIT":
        return 429;
      case "TIMEOUT":
        return 504;
      case "MODEL_UNAVAILABLE":
        return 503;
      case "MALFORMED_RESPONSE":
      case "API_FAILURE":
        return 502;
      default:
        return 502;
    }
  }

  if (error instanceof z.ZodError) {
    return 400;
  }

  if (
    error instanceof Error &&
    (
      error.message === "Invalid JSON body" ||
      error.message === "Request body is too large."
    )
  ) {
    return 400;
  }

  return 500;
}

// -----------------------------------------------------------------------------
// Server
// -----------------------------------------------------------------------------

const server = http.createServer(
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders());
      response.end();
      return;
    }

    const url = new URL(
      request.url || "/",
      "http://localhost"
    );

    const parts = url.pathname
      .split("/")
      .filter(Boolean);

    // This ID must come from trusted authentication middleware in production.
    const userId =
      request.headers["x-user-id"]?.toString();

    const requireAuth = (): boolean => {
      if (!userId) {
        sendError(
          response,
          401,
          "UNAUTHORIZED",
          "Authentication required. Please sign in."
        );

        return false;
      }

      return true;
    };

    let authenticatedRole: string | undefined;

    const getAuthenticatedRole = async (): Promise<string> => {
      if (!userId) {
        return "user";
      }

      if (authenticatedRole !== undefined) {
        return authenticatedRole;
      }

      const storedRole = await getUserRole(userId);

      authenticatedRole =
        typeof storedRole === "string"
          ? storedRole.toLowerCase()
          : "user";

      return authenticatedRole;
    };

    const requireAdmin = async (): Promise<boolean> => {
      if (!requireAuth()) {
        return false;
      }

      const role = await getAuthenticatedRole();

      if (role !== "admin") {
        sendError(
          response,
          403,
          "FORBIDDEN",
          "Admin access required."
        );

        return false;
      }

      return true;
    };

    const authorizeProject = async (projectId: string) => {
      if (!requireAuth()) {
        return undefined;
      }

      const role = await getAuthenticatedRole();

      const project = await getProject(
        projectId,
        userId,
        role
      );

      if (!project) {
        sendError(
          response,
          404,
          "NOT_FOUND",
          "Project not found"
        );

        return undefined;
      }

      return project;
    };

    try {
      // -----------------------------------------------------------------------
      // Health
      // -----------------------------------------------------------------------

      if (
        request.method === "GET" &&
        url.pathname === "/api/health"
      ) {
        return sendJson(response, 200, {
          success: true,
          data: {
            service: "sitecraft-backend",
            provider: provider.config.provider,
            model: provider.config.model,
            configured: provider.config.configured,
            message:
              provider.config.message ||
              "SiteCraft AI engine operational.",
          },
        });
      }

      // -----------------------------------------------------------------------
      // Configuration status
      // -----------------------------------------------------------------------

      if (
        request.method === "GET" &&
        url.pathname === "/api/config/status"
      ) {
        return sendJson(response, 200, {
          success: true,
          data: {
            gemini: Boolean(process.env.GEMINI_API_KEY),
            openai: Boolean(process.env.OPENAI_API_KEY),
            nvidia: Boolean(process.env.NVIDIA_API_KEY),
            bynara: Boolean(process.env.BYNARA_API_KEY),
            database: Boolean(process.env.DATABASE_URL),
            auth: Boolean(process.env.AUTH_SECRET),

            googleOAuth: Boolean(
              process.env.GOOGLE_CLIENT_ID &&
              process.env.GOOGLE_CLIENT_SECRET
            ),

            unsplash: Boolean(process.env.UNSPLASH_ACCESS_KEY),
            vercel: Boolean(process.env.VERCEL_TOKEN),

            activeProvider: provider.config.provider,
            activeModel: provider.config.model,
          },
        });
      }

      // =========================================================================
      // ADMIN API
      // =========================================================================

      if (
        parts[0] === "api" &&
        parts[1] === "admin"
      ) {
        if (!(await requireAdmin())) {
          return;
        }

        const subRoute = parts[2];
        const resourceId = parts[3];
        const action = parts[4];

        // Admin stats
        if (
          subRoute === "stats" &&
          request.method === "GET"
        ) {
          const dateRange =
            url.searchParams.get("dateRange") || undefined;

          const stats = await getAdminStats(dateRange);

          return sendJson(response, 200, {
            success: true,
            data: stats,
          });
        }

        // Recent activity
        if (
          subRoute === "activity" &&
          request.method === "GET"
        ) {
          const limit = positiveNumber(
            url.searchParams.get("limit"),
            10,
            100
          );

          const activity = await getAdminRecentActivity(limit);

          return sendJson(response, 200, {
            success: true,
            data: activity,
          });
        }

        // Audit logs
        if (
          subRoute === "audit-logs" &&
          request.method === "GET"
        ) {
          const page = positiveNumber(
            url.searchParams.get("page"),
            1
          );

          const pageSize = positiveNumber(
            url.searchParams.get("pageSize"),
            20,
            100
          );

          const logs = await listAdminAuditLogs({
            page,
            pageSize,
          });

          return sendJson(response, 200, {
            success: true,
            data: logs,
          });
        }

        // Users
        if (subRoute === "users") {
          if (
            !resourceId &&
            request.method === "GET"
          ) {
            const users = await listAdminUsers({
              page: positiveNumber(
                url.searchParams.get("page"),
                1
              ),
              pageSize: positiveNumber(
                url.searchParams.get("pageSize"),
                20,
                100
              ),
              search:
                url.searchParams.get("search") || undefined,
              role:
                url.searchParams.get("role") || undefined,
              dateRange:
                url.searchParams.get("dateRange") || undefined,
            });

            return sendJson(response, 200, {
              success: true,
              data: users,
            });
          }

          if (
            resourceId &&
            !action &&
            request.method === "GET"
          ) {
            const user = await getAdminUserDetail(resourceId);

            if (!user) {
              return sendError(
                response,
                404,
                "NOT_FOUND",
                "User not found"
              );
            }

            return sendJson(response, 200, {
              success: true,
              data: user,
            });
          }

          if (
            resourceId &&
            action === "role" &&
            request.method === "PATCH"
          ) {
            const body = (await readBody(request)) as {
              role?: "USER" | "ADMIN";
            };

            if (
              !body?.role ||
              !["USER", "ADMIN"].includes(body.role)
            ) {
              return sendError(
                response,
                400,
                "INVALID_ROLE",
                "Role must be USER or ADMIN"
              );
            }

            const result = await updateUserRole(
              userId!,
              resourceId,
              body.role
            );

            if (!result.success) {
              return sendError(
                response,
                400,
                "UPDATE_FAILED",
                result.error || "Failed to update role"
              );
            }

            return sendJson(response, 200, {
              success: true,
              data: result.user,
            });
          }
        }

        // Projects
        if (subRoute === "projects") {
          if (
            !resourceId &&
            request.method === "GET"
          ) {
            const projects = await listAdminProjects({
              page: positiveNumber(
                url.searchParams.get("page"),
                1
              ),
              pageSize: positiveNumber(
                url.searchParams.get("pageSize"),
                20,
                100
              ),
              search:
                url.searchParams.get("search") || undefined,
              status:
                url.searchParams.get("status") || undefined,
              framework:
                url.searchParams.get("framework") || undefined,
              userId:
                url.searchParams.get("userId") || undefined,
              dateRange:
                url.searchParams.get("dateRange") || undefined,
            });

            return sendJson(response, 200, {
              success: true,
              data: projects,
            });
          }

          if (
            resourceId &&
            request.method === "GET"
          ) {
            const project =
              await getAdminProjectDetail(resourceId);

            if (!project) {
              return sendError(
                response,
                404,
                "NOT_FOUND",
                "Project not found"
              );
            }

            return sendJson(response, 200, {
              success: true,
              data: project,
            });
          }
        }

        // Websites
        if (subRoute === "websites") {
          if (
            !resourceId &&
            request.method === "GET"
          ) {
            const websites = await listAdminWebsites({
              page: positiveNumber(
                url.searchParams.get("page"),
                1
              ),
              pageSize: positiveNumber(
                url.searchParams.get("pageSize"),
                20,
                100
              ),
              search:
                url.searchParams.get("search") || undefined,
              theme:
                url.searchParams.get("theme") || undefined,
            });

            return sendJson(response, 200, {
              success: true,
              data: websites,
            });
          }

          if (
            resourceId &&
            request.method === "GET"
          ) {
            const website =
              await getAdminWebsiteDetail(resourceId);

            if (!website) {
              return sendError(
                response,
                404,
                "NOT_FOUND",
                "Website not found"
              );
            }

            return sendJson(response, 200, {
              success: true,
              data: website,
            });
          }
        }

        // Generations
        if (subRoute === "generations") {
          if (
            !resourceId &&
            request.method === "GET"
          ) {
            const generations = await listAdminGenerations({
              page: positiveNumber(
                url.searchParams.get("page"),
                1
              ),
              pageSize: positiveNumber(
                url.searchParams.get("pageSize"),
                20,
                100
              ),
              search:
                url.searchParams.get("search") || undefined,
              agent:
                url.searchParams.get("agent") || undefined,
              status:
                url.searchParams.get("status") || undefined,
              projectId:
                url.searchParams.get("projectId") || undefined,
              userId:
                url.searchParams.get("userId") || undefined,
              dateRange:
                url.searchParams.get("dateRange") || undefined,
            });

            return sendJson(response, 200, {
              success: true,
              data: generations,
            });
          }

          if (
            resourceId &&
            request.method === "GET"
          ) {
            const generation =
              await getAdminGenerationDetail(resourceId);

            if (!generation) {
              return sendError(
                response,
                404,
                "NOT_FOUND",
                "Generation not found"
              );
            }

            return sendJson(response, 200, {
              success: true,
              data: generation,
            });
          }
        }

        // AI usage
        if (
          subRoute === "usage" &&
          request.method === "GET"
        ) {
          const usage = await getAdminUsageAnalytics({
            page: positiveNumber(
              url.searchParams.get("page"),
              1
            ),
            pageSize: positiveNumber(
              url.searchParams.get("pageSize"),
              20,
              100
            ),
            provider:
              url.searchParams.get("provider") || undefined,
            model:
              url.searchParams.get("model") || undefined,
            userId:
              url.searchParams.get("userId") || undefined,
            dateRange:
              url.searchParams.get("dateRange") || undefined,
          });

          return sendJson(response, 200, {
            success: true,
            data: usage,
          });
        }

        // Deployments
        if (
          subRoute === "deployments" &&
          request.method === "GET"
        ) {
          const deployments = await listAdminDeployments({
            page: positiveNumber(
              url.searchParams.get("page"),
              1
            ),
            pageSize: positiveNumber(
              url.searchParams.get("pageSize"),
              20,
              100
            ),
            provider:
              url.searchParams.get("provider") || undefined,
            status:
              url.searchParams.get("status") || undefined,
            search:
              url.searchParams.get("search") || undefined,
          });

          return sendJson(response, 200, {
            success: true,
            data: deployments,
          });
        }

        // Chats
        if (
          subRoute === "chats" &&
          request.method === "GET"
        ) {
          const chats = await listAdminChats({
            page: positiveNumber(
              url.searchParams.get("page"),
              1
            ),
            pageSize: positiveNumber(
              url.searchParams.get("pageSize"),
              20,
              100
            ),
            search:
              url.searchParams.get("search") || undefined,
            projectId:
              url.searchParams.get("projectId") || undefined,
          });

          return sendJson(response, 200, {
            success: true,
            data: chats,
          });
        }

        return sendError(
          response,
          404,
          "NOT_FOUND",
          "Admin route not found"
        );
      }

      // =========================================================================
      // STANDARD USER API
      // =========================================================================

      // List projects
      if (
        request.method === "GET" &&
        url.pathname === "/api/projects"
      ) {
        if (!requireAuth()) {
          return;
        }

        const role = await getAuthenticatedRole();

        const projects = await listProjects(
          userId!,
          role
        );

        return sendJson(response, 200, {
          success: true,
          data: projects,
        });
      }

      // Create project
      if (
        request.method === "POST" &&
        url.pathname === "/api/projects"
      ) {
        if (!requireAuth()) {
          return;
        }

        const body = createProjectSchema.parse(
          await readBody(request)
        );

        const project = await createProject({
          userId: userId!,
          name: body.name,
          description: body.description,
          initialPrompt: body.initialPrompt,
        });

        return sendJson(response, 201, {
          success: true,
          data: project,
        });
      }

      // =========================================================================
      // PROJECT ROUTES
      // =========================================================================

      if (
        parts[0] === "api" &&
        parts[1] === "projects" &&
        parts[2]
      ) {
        const projectId = parts[2];
        const action = parts[3];

        // Get or delete project
        if (!action) {
          if (request.method === "GET") {
            const project =
              await authorizeProject(projectId);

            if (!project) {
              return;
            }

            return sendJson(response, 200, {
              success: true,
              data: project,
            });
          }

          if (request.method === "DELETE") {
            const project =
              await authorizeProject(projectId);

            if (!project) {
              return;
            }

            await deleteProject(projectId);

            return sendJson(response, 200, {
              success: true,
              data: {
                id: projectId,
              },
            });
          }
        }

        // Generate website
        if (
          request.method === "POST" &&
          action === "generate"
        ) {
          const project =
            await authorizeProject(projectId);

          if (!project) {
            return;
          }

          const body = promptSchema.parse(
            await readBody(request)
          );

          const result = await generateProject(
            projectId,
            body.prompt
          );

          await recordApiUsage(
            userId!,
            result.provider || provider.config.provider,
            result.model || provider.config.model,
            1250
          );

          return sendJson(response, 200, {
            success: true,
            data: result,
          });
        }

        // Revise website
        if (
          request.method === "POST" &&
          action === "revise"
        ) {
          const project =
            await authorizeProject(projectId);

          if (!project) {
            return;
          }

          const body = promptSchema.parse(
            await readBody(request)
          );

          const result = await reviseProject(
            projectId,
            body.prompt
          );

          await recordApiUsage(
            userId!,
            result.provider || provider.config.provider,
            result.model || provider.config.model,
            650
          );

          return sendJson(response, 200, {
            success: true,
            data: result,
          });
        }

        // Export website
        if (
          request.method === "GET" &&
          action === "export"
        ) {
          const project =
            await authorizeProject(projectId);

          if (!project) {
            return;
          }

          const website = project.websites[0];

          if (!website) {
            return sendError(
              response,
              400,
              "NO_WEBSITE",
              "Generate a website first"
            );
          }

          const zip = new JSZip();

          for (const file of website.generatedCode.files) {
            const safePath = sanitizeZipPath(file.path);

            if (!safePath) {
              continue;
            }

            zip.file(safePath, file.content);
          }

          zip.file(
            "dist/index.html",
            website.generatedCode.html
          );

          const archive = await zip.generateAsync({
            type: "nodebuffer",
          });

          const safeProjectName = sanitizeZipName(project.name);

          response.writeHead(200, {
            ...corsHeaders(),
            "Content-Type": "application/zip",
            "Content-Disposition":
              `attachment; filename="${safeProjectName}-site.zip"`,
          });

          response.end(archive);
          return;
        }

        // Deploy website
        if (
          request.method === "POST" &&
          action === "deploy"
        ) {
          const project =
            await authorizeProject(projectId);

          if (!project) {
            return;
          }

          const body = (await readBody(request)) as {
            provider?: string;
          };

          const deployProvider = body.provider || "vercel";
          const latestWebsite = project.websites[0];

          if (!latestWebsite) {
            return sendError(
              response,
              400,
              "NO_WEBSITE",
              "Cannot deploy a project without generated website code."
            );
          }

          let deployResult;

          if (deployProvider === "netlify") {
            deployResult = await deployToNetlify(
              project.name,
              latestWebsite.generatedCode
            );
          } else if (deployProvider === "vercel") {
            deployResult = await deployToVercel(
              project.name,
              latestWebsite.generatedCode
            );
          } else {
            return sendError(
              response,
              400,
              "INVALID_DEPLOY_PROVIDER",
              "Deployment provider must be vercel or netlify."
            );
          }

          if (deployResult.success) {
            await recordDeployment(projectId, {
              provider: deployResult.provider,
              deploymentUrl: deployResult.deploymentUrl,
              deploymentId: deployResult.deploymentId,
              status: deployResult.status,
            });
          }

          return sendJson(
            response,
            deployResult.success ? 200 : 400,
            {
              success: deployResult.success,
              data: deployResult,

              ...(deployResult.error
                ? {
                    error: {
                      code: "DEPLOYMENT_FAILED",
                      message: deployResult.error,
                    },
                  }
                : {}),
            }
          );
        }
      }

      // Unknown route
      return sendError(
        response,
        404,
        "NOT_FOUND",
        "Route not found"
      );
    } catch (error) {
      const failure = errorResponse(error);
      const status = errorStatus(error);

      const publicFailure =
        status >= 500 && !(error instanceof ProviderError)
          ? {
              code: "INTERNAL_SERVER_ERROR",
              message: "An unexpected server error occurred.",
            }
          : failure;

      console.error(
        JSON.stringify({
          event: "request_failed",
          method: request.method,
          path: url.pathname,
          error: publicFailure,

          ...(error instanceof ProviderError
            ? {
                provider: error.provider,
                model: error.model,
                status: error.status,
              }
            : {}),
        })
      );

      return sendJson(response, status, {
        success: false,
        error: publicFailure,
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Server startup
// -----------------------------------------------------------------------------

server.listen(port, () => {
  console.log(
    JSON.stringify({
      event: "backend_started",
      port,
      activeProvider: provider.config.provider,
      model: provider.config.model,
      configured: provider.config.configured,
    })
  );
});

// -----------------------------------------------------------------------------
// Graceful shutdown
// -----------------------------------------------------------------------------

let shuttingDown = false;

const handleShutdown = () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    JSON.stringify({
      event: "backend_shutdown",
    })
  );

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 1000).unref();
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);