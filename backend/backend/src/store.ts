```ts
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

import {
  createProjectSchema,
  promptSchema,
} from "./validators.js";

import {
  generateProject,
  reviseProject,
} from "./orchestrator.js";

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

const port = Number(
  process.env.BACKEND_PORT || 4000
);

const provider = createProvider();

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:3000";

const MAX_BODY_SIZE =
  Number(process.env.MAX_BODY_SIZE) ||
  2 * 1024 * 1024;

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_ACTIVITY_LIMIT = 100;

// -----------------------------------------------------------------------------
// CORS
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

// -----------------------------------------------------------------------------
// Response helpers
// -----------------------------------------------------------------------------

function sendJson(
  response: http.ServerResponse,
  status: number,
  body: unknown
) {
  if (response.headersSent) {
    return;
  }

  response.writeHead(status, {
    ...corsHeaders(),
    "Content-Type":
      "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  response.end(
    JSON.stringify(body)
  );
}

function sendError(
  response: http.ServerResponse,
  status: number,
  code: string,
  message: string
) {
  return sendJson(response, status, {
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
    throw new RequestBodyTooLargeError();
  }

  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);

    totalSize += buffer.length;

    if (totalSize > MAX_BODY_SIZE) {
      throw new RequestBodyTooLargeError();
    }

    chunks.push(buffer);
  }

  if (!chunks.length) {
    return {};
  }

  const rawBody =
    Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new InvalidJsonError();
  }
}

function getPositiveInteger(
  value: string | null,
  fallback: number,
  maximum = MAX_PAGE_SIZE
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return Math.min(
    Math.floor(parsed),
    maximum
  );
}

function getPageParams(
  url: URL
) {
  return {
    page: getPositiveInteger(
      url.searchParams.get("page"),
      1,
      Number.MAX_SAFE_INTEGER
    ),

    pageSize: getPositiveInteger(
      url.searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE
    ),
  };
}

// -----------------------------------------------------------------------------
// Custom request errors
// -----------------------------------------------------------------------------

class InvalidJsonError extends Error {
  constructor() {
    super("Invalid JSON body.");
    this.name = "InvalidJsonError";
  }
}

class RequestBodyTooLargeError extends Error {
  constructor() {
    super(
      `Request body exceeds the maximum allowed size of ${MAX_BODY_SIZE} bytes.`
    );

    this.name =
      "RequestBodyTooLargeError";
  }
}

// -----------------------------------------------------------------------------
// Error handling
// -----------------------------------------------------------------------------

function errorResponse(
  error: unknown
): {
  code: string;
  message: string;
} {
  if (error instanceof z.ZodError) {
    return {
      code: "INVALID_INPUT",
      message:
        error.issues[0]?.message ||
        "Invalid input.",
    };
  }

  if (error instanceof ProviderError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (
    error instanceof InvalidJsonError
  ) {
    return {
      code: "INVALID_JSON",
      message: error.message,
    };
  }

  if (
    error instanceof RequestBodyTooLargeError
  ) {
    return {
      code: "PAYLOAD_TOO_LARGE",
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
    message: "Request failed.",
  };
}

function errorStatus(
  error: unknown
): number {
  if (error instanceof z.ZodError) {
    return 400;
  }

  if (
    error instanceof InvalidJsonError
  ) {
    return 400;
  }

  if (
    error instanceof RequestBodyTooLargeError
  ) {
    return 413;
  }

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
        return 502;

      case "API_FAILURE":
        return 502;

      default:
        return 502;
    }
  }

  return 500;
}

// -----------------------------------------------------------------------------
// Security helpers
// -----------------------------------------------------------------------------

function sanitizeZipName(
  name: string
) {
  const safeName = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return (
    safeName || "sitecraft-site"
  );
}

function sanitizeZipPath(
  filePath: string
) {
  const normalized =
    filePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

  const parts = normalized
    .split("/")
    .filter(
      (part) =>
        part &&
        part !== "." &&
        part !== ".."
    );

  return parts.join("/");
}

// -----------------------------------------------------------------------------
// Server
// -----------------------------------------------------------------------------

const server = http.createServer(
  async (
    request,
    response
  ) => {
    // ---------------------------------------------------------------------------
    // CORS preflight
    // ---------------------------------------------------------------------------

    if (
      request.method === "OPTIONS"
    ) {
      response.writeHead(
        204,
        corsHeaders()
      );

      response.end();
      return;
    }

    const url = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`
    );

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    const userId =
      request.headers[
        "x-user-id"
      ]?.toString();

    /*
     * This header is kept for compatibility with
     * existing project-store calls, but it is NOT
     * trusted for admin authorization.
     */
    const suppliedUserRole =
      request.headers[
        "x-user-role"
      ]?.toString();

    // ---------------------------------------------------------------------------
    // Authentication
    // ---------------------------------------------------------------------------

    const requireAuth = () => {
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

    const requireAdmin =
      async () => {
        if (!requireAuth()) {
          return false;
        }

        /*
         * Always use the stored role for admin
         * authorization instead of trusting a
         * client-provided x-user-role header.
         */
        const storedRole =
          await getUserRole(userId!);

        const role =
          typeof storedRole === "string"
            ? storedRole.toUpperCase()
            : "";

        if (role !== "ADMIN") {
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

    const authorizeProject =
      async (
        projectId: string
      ) => {
        if (!requireAuth()) {
          return undefined;
        }

        const project =
          await getProject(
            projectId,
            userId,
            suppliedUserRole
          );

        if (!project) {
          sendError(
            response,
            404,
            "NOT_FOUND",
            "Project not found."
          );

          return undefined;
        }

        return project;
      };

    try {
      // =========================================================================
      // HEALTH
      // =========================================================================

      if (
        request.method === "GET" &&
        url.pathname === "/api/health"
      ) {
        return sendJson(
          response,
          200,
          {
            success: true,

            data: {
              service:
                "sitecraft-backend",

              provider:
                provider.config.provider,

              model:
                provider.config.model,

              configured:
                provider.config.configured,

              message:
                provider.config.message ||
                "SiteCraft AI engine operational.",
            },
          }
        );
      }

      // =========================================================================
      // CONFIG STATUS
      // =========================================================================

      if (
        request.method === "GET" &&
        url.pathname ===
          "/api/config/status"
      ) {
        return sendJson(
          response,
          200,
          {
            success: true,

            data: {
              gemini: Boolean(
                process.env.GEMINI_API_KEY
              ),

              openai: Boolean(
                process.env.OPENAI_API_KEY
              ),

              nvidia: Boolean(
                process.env.NVIDIA_API_KEY
              ),

              bynara: Boolean(
                process.env.BYNARA_API_KEY
              ),

              database: Boolean(
                process.env.DATABASE_URL
              ),

              auth: Boolean(
                process.env.AUTH_SECRET
              ),

              googleOAuth: Boolean(
                process.env.GOOGLE_CLIENT_ID &&
                  process.env
                    .GOOGLE_CLIENT_SECRET
              ),

              unsplash: Boolean(
                process.env
                  .UNSPLASH_ACCESS_KEY
              ),

              vercel: Boolean(
                process.env.VERCEL_TOKEN
              ),

              activeProvider:
                provider.config.provider,

              activeModel:
                provider.config.model,

              configured:
                provider.config.configured,
            },
          }
        );
      }

      // =========================================================================
      // ADMIN API
      // =========================================================================

      if (
        parts[0] === "api" &&
        parts[1] === "admin"
      ) {
        if (
          !(await requireAdmin())
        ) {
          return;
        }

        const subRoute =
          parts[2];

        const resourceId =
          parts[3];

        const action =
          parts[4];

        // -----------------------------------------------------------------------
        // Stats
        // -----------------------------------------------------------------------

        if (
          subRoute === "stats" &&
          request.method === "GET"
        ) {
          const dateRange =
            url.searchParams.get(
              "dateRange"
            ) || undefined;

          const stats =
            await getAdminStats(
              dateRange
            );

          return sendJson(
            response,
            200,
            {
              success: true,
              data: stats,
            }
          );
        }

        // -----------------------------------------------------------------------
        // Activity
        // -----------------------------------------------------------------------

        if (
          subRoute === "activity" &&
          request.method === "GET"
        ) {
          const limit =
            getPositiveInteger(
              url.searchParams.get(
                "limit"
              ),
              10,
              MAX_ACTIVITY_LIMIT
            );

          const activity =
            await getAdminRecentActivity(
              limit
            );

          return sendJson(
            response,
            200,
            {
              success: true,
              data: activity,
            }
          );
        }

        // -----------------------------------------------------------------------
        // Audit logs
        // -----------------------------------------------------------------------

        if (
          subRoute === "audit-logs" &&
          request.method === "GET"
        ) {
          const {
            page,
            pageSize,
          } = getPageParams(url);

          const logs =
            await listAdminAuditLogs({
              page,
              pageSize,
            });

          return sendJson(
            response,
            200,
            {
              success: true,
              data: logs,
            }
          );
        }

        // -----------------------------------------------------------------------
        // Users
        // -----------------------------------------------------------------------

        if (
          subRoute === "users"
        ) {
          if (
            !resourceId &&
            request.method === "GET"
          ) {
            const {
              page,
              pageSize,
            } = getPageParams(url);

            const search =
              url.searchParams.get(
                "search"
              ) || undefined;

            const role =
              url.searchParams.get(
                "role"
              ) || undefined;

            const dateRange =
              url.searchParams.get(
                "dateRange"
              ) || undefined;

            const users =
              await listAdminUsers({
                page,
                pageSize,
                search,
                role,
                dateRange,
              });

            return sendJson(
              response,
              200,
              {
                success: true,
                data: users,
              }
            );
          }

          if (
            resourceId &&
            !action &&
            request.method === "GET"
          ) {
            const user =
              await getAdminUserDetail(
                resourceId
              );

            if (!user) {
              return sendError(
                response,
                404,
                "NOT_FOUND",
                "User not found."
              );
            }

            return sendJson(
              response,
              200,
              {
                success: true,
                data: user,
              }
            );
          }

          if (
            resourceId &&
            action === "role" &&
            request.method === "PATCH"
          ) {
            const body =
              (await readBody(
                request
              )) as {
                role?:
                  | "USER"
                  | "ADMIN";
              };

            if (
              body.role !== "USER" &&
              body.role !== "ADMIN"
            ) {
              return sendError(
                response,
                400,
                "INVALID_ROLE",
                "Role must be USER or ADMIN."
              );
            }

            const result =
              await updateUserRole(
                userId!,
                resourceId,
                body.role
              );

            if (!result.success) {
              return sendError(
                response,
                400,
                "UPDATE_FAILED",
                result.error ||
                  "Failed to update role."
              );
            }

            return sendJson(
              response,
              200,
              {
                success: true,
                data: result.user,
              }
            );
          }
        }

        // -----------------------------------------------------------------------
        // Projects
        // -----------------------------------------------------------------------

        if (
          subRoute === "projects"
        ) {
          if (
            !resourceId &&
            request.method === "GET"
          ) {
            const {
              page,
              pageSize,
            } = getPageParams(url);

            const search =
              url.searchParams.get(
                "search"
              ) || undefined;

            const status =
              url.searchParams.get(
                "status"
              ) || undefined;

            const framework =
              url.searchParams.get(
                "framework"
              ) || undefined;

            const adminUserId =
              url.searchParams.get(
                "userId"
              ) || undefined;

            const dateRange =
              url.searchParams.get(
                "dateRange"
              ) || undefined;

            const projects =
              await listAdminProjects({
                page,
                pageSize,
                search,
                status,
                framework,
                userId:
                  adminUserId,
                dateRange,
              });

            return sendJson(
              response,
              200,
              {
                success: true,
                data: projects,
              }
            );
          }

          if (
            resourceId &&
            request.method === "GET"
          ) {
            const project =
              await getAdminProjectDetail(
                resourceId
              );

            if (!project) {
              return sendError(
                response,
                404,
                "NOT_FOUND",
                "Project not found."
              );
            }

            return sendJson(
              response,
              200,
              {
                success: true,
                data: project,
              }
            );
          }
        }

        // -----------------------------------------------------------------------
        // Websites
        // -----------------------------------------------------------------------

        if (
          subRoute === "websites"
        ) {
          if (
            !resourceId &&
            request.method === "GET"
          ) {
            const {
              page,
              pageSize,
            } = getPageParams(url);

            const search =
              url.searchParams.get(
                "search"
              ) || undefined;

            const theme =
              url.searchParams.get(
                "theme"
              ) || undefined;

            const websites =
              await listAdminWebsites({
                page,
                pageSize,
                search,
                theme,
              });

            return sendJson(
              response,
              200,
              {
                success: true,
                data: websites,
              }
            );
          }

          if (
            resourceId &&
            request.method === "GET"
          ) {
            const website =
              await getAdminWebsiteDetail(
                resourceId
              );

            if (!website) {
              return sendError(
                response,
                404,
                "NOT_FOUND",
                "Website not found."
              );
            }

            return sendJson(
              response,
              200,
              {
                success: true,
                data: website,
              }
            );
          }
        }

        // -----------------------------------------------------------------------
        // Generations
        // -----------------------------------------------------------------------

        if (
          subRoute === "generations"
        ) {
          if (
            !resourceId &&
            request.method === "GET"
          ) {
            const {
              page,
              pageSize,
            } = getPageParams(url);

            const search =
              url.searchParams.get(
                "search"
              ) || undefined;

            const agent =
              url.searchParams.get(
                "agent"
              ) || undefined;

            const status =
              url.searchParams.get(
                "status"
              ) || undefined;

            const projectId =
              url.searchParams.get(
                "projectId"
              ) || undefined;

            const adminUserId =
              url.searchParams.get(
                "userId"
              ) || undefined;

            const dateRange =
              url.searchParams.get(
                "dateRange"
              ) || undefined;

            const generations =
              await listAdminGenerations({
                page,
                pageSize,
                search,
                agent,
                status,
                projectId,
                userId:
                  adminUserId,
                dateRange,
              });

            return sendJson(
              response,
              200,
              {
                success: true,
                data: generations,
              }
            );
          }

          if (
            resourceId &&
            request.method === "GET"
          ) {
            const generation =
              await getAdminGenerationDetail(
                resourceId
              );

            if (!generation) {
              return sendError(
                response,
                404,
                "NOT_FOUND",
                "Generation not found."
              );
            }

            return sendJson(
              response,
              200,
              {
                success: true,
                data: generation,
              }
            );
          }
        }

        // -----------------------------------------------------------------------
        // Usage
        // -----------------------------------------------------------------------

        if (
          subRoute === "usage" &&
          request.method === "GET"
        ) {
          const {
            page,
            pageSize,
          } = getPageParams(url);

          const selectedProvider =
            url.searchParams.get(
              "provider"
            ) || undefined;

          const model =
            url.searchParams.get(
              "model"
            ) || undefined;

          const adminUserId =
            url.searchParams.get(
              "userId"
            ) || undefined;

          const dateRange =
            url.searchParams.get(
              "dateRange"
            ) || undefined;

          const usage =
            await getAdminUsageAnalytics({
              page,
              pageSize,
              provider:
                selectedProvider,
              model,
              userId:
                adminUserId,
              dateRange,
            });

          return sendJson(
            response,
            200,
            {
              success: true,
              data: usage,
            }
          );
        }

        // -----------------------------------------------------------------------
        // Deployments
        // -----------------------------------------------------------------------

        if (
          subRoute === "deployments" &&
          request.method === "GET"
        ) {
          const {
            page,
            pageSize,
          } = getPageParams(url);

          const selectedProvider =
            url.searchParams.get(
              "provider"
            ) || undefined;

          const status =
            url.searchParams.get(
              "status"
            ) || undefined;

          const search =
            url.searchParams.get(
              "search"
            ) || undefined;

          const deployments =
            await listAdminDeployments({
              page,
              pageSize,
              provider:
                selectedProvider,
              status,
              search,
            });

          return sendJson(
            response,
            200,
            {
              success: true,
              data: deployments,
            }
          );
        }

        // -----------------------------------------------------------------------
        // Chats
        // -----------------------------------------------------------------------

        if (
          subRoute === "chats" &&
          request.method === "GET"
        ) {
          const {
            page,
            pageSize,
          } = getPageParams(url);

          const search =
            url.searchParams.get(
              "search"
            ) || undefined;

          const projectId =
            url.searchParams.get(
              "projectId"
            ) || undefined;

          const chats =
            await listAdminChats({
              page,
              pageSize,
              search,
              projectId,
            });

          return sendJson(
            response,
            200,
            {
              success: true,
              data: chats,
            }
          );
        }

        return sendError(
          response,
          404,
          "NOT_FOUND",
          "Admin route not found."
        );
      }

      // =========================================================================
      // USER PROJECT LIST
      // =========================================================================

      if (
        request.method === "GET" &&
        url.pathname === "/api/projects"
      ) {
        if (!requireAuth()) {
          return;
        }

        const projects =
          await listProjects(
            userId!,
            suppliedUserRole
          );

        return sendJson(
          response,
          200,
          {
            success: true,
            data: projects,
          }
        );
      }

      // =========================================================================
      // CREATE PROJECT
      // =========================================================================

      if (
        request.method === "POST" &&
        url.pathname === "/api/projects"
      ) {
        if (!requireAuth()) {
          return;
        }

        const body =
          createProjectSchema.parse(
            await readBody(request)
          );

        const project =
          await createProject({
            userId: userId!,
            name: body.name,
            description:
              body.description,
            initialPrompt:
              body.initialPrompt,
            framework:
              body.framework,
          });

        return sendJson(
          response,
          201,
          {
            success: true,
            data: project,
          }
        );
      }

      // =========================================================================
      // PROJECT ROUTES
      // =========================================================================

      if (
        parts[0] === "api" &&
        parts[1] === "projects" &&
        parts[2]
      ) {
        const projectId =
          parts[2];

        const action =
          parts[3];

        // -----------------------------------------------------------------------
        // Get / Delete project
        // -----------------------------------------------------------------------

        if (!action) {
          if (
            request.method === "GET"
          ) {
            const project =
              await authorizeProject(
                projectId
              );

            if (!project) {
              return;
            }

            return sendJson(
              response,
              200,
              {
                success: true,
                data: project,
              }
            );
          }

          if (
            request.method ===
            "DELETE"
          ) {
            const project =
              await authorizeProject(
                projectId
              );

            if (!project) {
              return;
            }

            await deleteProject(
              projectId
            );

            return sendJson(
              response,
              200,
              {
                success: true,
                data: {
                  id: projectId,
                },
              }
            );
          }
        }

        // -----------------------------------------------------------------------
        // Generate
        // -----------------------------------------------------------------------

        if (
          request.method === "POST" &&
          action === "generate"
        ) {
          const project =
            await authorizeProject(
              projectId
            );

          if (!project) {
            return;
          }

          const body =
            promptSchema.parse(
              await readBody(request)
            );

          const result =
            await generateProject(
              projectId,
              body.prompt
            );

          /*
           * Do not hard-code Gemini here.
           * The actual active provider/model
           * is recorded instead.
           */
          await recordApiUsage(
            userId!,
            result.provider ||
              provider.config.provider,
            provider.config.model,
            1250
          );

          return sendJson(
            response,
            200,
            {
              success: true,
              data: result,
            }
          );
        }

        // -----------------------------------------------------------------------
        // Revise
        // -----------------------------------------------------------------------

        if (
          request.method === "POST" &&
          action === "revise"
        ) {
          const project =
            await authorizeProject(
              projectId
            );

          if (!project) {
            return;
          }

          const body =
            promptSchema.parse(
              await readBody(request)
            );

          const result =
            await reviseProject(
              projectId,
              body.prompt
            );

          await recordApiUsage(
            userId!,
            provider.config.provider,
            provider.config.model,
            650
          );

          return sendJson(
            response,
            200,
            {
              success: true,
              data: result,
            }
          );
        }

        // -----------------------------------------------------------------------
        // Export
        // -----------------------------------------------------------------------

        if (
          request.method === "GET" &&
          action === "export"
        ) {
          const project =
            await authorizeProject(
              projectId
            );

          if (!project) {
            return;
          }

          const website =
            project.websites[0];

          if (!website) {
            return sendError(
              response,
              400,
              "NO_WEBSITE",
              "Generate a website first."
            );
          }

          const zip =
            new JSZip();

          for (
            const file of
            website.generatedCode.files
          ) {
            const safePath =
              sanitizeZipPath(
                file.path
              );

            if (!safePath) {
              continue;
            }

            zip.file(
              safePath,
              file.content
            );
          }

          zip.file(
            "dist/index.html",
            website.generatedCode.html
          );

          const archive =
            await zip.generateAsync({
              type: "nodebuffer",
              compression: "DEFLATE",
              compressionOptions: {
                level: 6,
              },
            });

          const filename =
            `${sanitizeZipName(
              project.name
            )}-site.zip`;

          response.writeHead(
            200,
            {
              ...corsHeaders(),
              "Content-Type":
                "application/zip",
              "Content-Disposition":
                `attachment; filename="${filename}"`,
              "Content-Length":
                archive.length,
              "Cache-Control":
                "no-store",
            }
          );

          response.end(
            archive
          );

          return;
        }

        // -----------------------------------------------------------------------
        // Deploy
        // -----------------------------------------------------------------------

        if (
          request.method === "POST" &&
          action === "deploy"
        ) {
          const project =
            await authorizeProject(
              projectId
            );

          if (!project) {
            return;
          }

          const body =
            (await readBody(
              request
            )) as {
              provider?: string;
            };

          const deployProvider =
            body.provider ||
            "vercel";

          const latestWebsite =
            project.websites[0];

          if (!latestWebsite) {
            return sendError(
              response,
              400,
              "NO_WEBSITE",
              "Cannot deploy a project without generated website code."
            );
          }

          if (
            deployProvider !==
              "vercel" &&
            deployProvider !==
              "netlify"
          ) {
            return sendError(
              response,
              400,
              "INVALID_DEPLOY_PROVIDER",
              "Deployment provider must be vercel or netlify."
            );
          }

          let deployResult;

          if (
            deployProvider ===
            "netlify"
          ) {
            deployResult =
              await deployToNetlify(
                project.name,
                latestWebsite.generatedCode
              );
          } else {
            deployResult =
              await deployToVercel(
                project.name,
                latestWebsite.generatedCode
              );
          }

          if (
            deployResult.success
          ) {
            await recordDeployment(
              projectId,
              {
                provider:
                  deployResult.provider,

                deploymentUrl:
                  deployResult.deploymentUrl,

                deploymentId:
                  deployResult.deploymentId,

                status:
                  deployResult.status,
              }
            );
          }

          return sendJson(
            response,
            deployResult.success
              ? 200
              : 400,
            {
              success:
                deployResult.success,

              data:
                deployResult,

              ...(deployResult.error
                ? {
                    error: {
                      code:
                        "DEPLOYMENT_FAILED",

                      message:
                        deployResult.error,
                    },
                  }
                : {}),
            }
          );
        }
      }

      // =========================================================================
      // UNKNOWN ROUTE
      // =========================================================================

      return sendError(
        response,
        404,
        "NOT_FOUND",
        "Route not found."
      );
    } catch (error) {
      const failure =
        errorResponse(error);

      console.error(
        JSON.stringify({
          event:
            "request_failed",

          method:
            request.method,

          path:
            url.pathname,

          error:
            failure,

          ...(error instanceof
          ProviderError
            ? {
                provider:
                  error.provider,

                model:
                  error.model,

                status:
                  error.status,
              }
            : {}),
        })
      );

      return sendJson(
        response,
        errorStatus(error),
        {
          success: false,
          error: failure,
        }
      );
    }
  }
);

// -----------------------------------------------------------------------------
// Startup
// -----------------------------------------------------------------------------

server.listen(
  port,
  () => {
    console.log(
      JSON.stringify({
        event:
          "backend_started",

        port,

        activeProvider:
          provider.config.provider,

        model:
          provider.config.model,

        configured:
          provider.config.configured,
      })
    );
  }
);

// -----------------------------------------------------------------------------
// Graceful shutdown
// -----------------------------------------------------------------------------

let shuttingDown = false;

function handleShutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    JSON.stringify({
      event:
        "backend_shutdown_started",
    })
  );

  server.close(() => {
    console.log(
      JSON.stringify({
        event:
          "backend_shutdown_complete",
      })
    );

    process.exit(0);
  });

  setTimeout(() => {
    console.error(
      JSON.stringify({
        event:
          "backend_forced_shutdown",
      })
    );

    process.exit(1);
  }, 5000).unref();
}

process.on(
  "SIGINT",
  handleShutdown
);

process.on(
  "SIGTERM",
  handleShutdown
);
```
