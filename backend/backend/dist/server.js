
import dotenv from "dotenv";
import path from "node:path";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import JSZip from "jszip";
import { z } from "zod";

import { createProvider, ProviderError } from "@sitecraft/ml";

import {
  listProjects,
  createProject,
  getProject,
  deleteProject,
  recordDeployment,
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

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const port = Number(process.env.BACKEND_PORT || 4000);
const frontendOrigin =
  process.env.FRONTEND_ORIGIN || "http://localhost:3000";

const provider = createProvider();

type ApiError = {
  code: string;
  message: string;
};

class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  if (response.writableEnded) return;

  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": frontendOrigin,
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-user-id, x-user-role",
    "Access-Control-Allow-Methods":
      "GET, POST, DELETE, OPTIONS",
  });

  response.end(JSON.stringify(body));
}

async function readBody(
  request: IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalSize = 0;
  const maxSize = 1_000_000;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk);

    totalSize += buffer.length;

    if (totalSize > maxSize) {
      throw new HttpError(
        "Request body is too large.",
        413,
        "PAYLOAD_TOO_LARGE",
      );
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(
      Buffer.concat(chunks).toString("utf8"),
    ) as unknown;
  } catch {
    throw new HttpError(
      "Invalid JSON body.",
      400,
      "INVALID_JSON",
    );
  }
}

function errorResponse(error: unknown): ApiError {
  if (error instanceof z.ZodError) {
    return {
      code: "INVALID_INPUT",
      message: error.issues[0]?.message || "Invalid input.",
    };
  }

  if (error instanceof ProviderError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof HttpError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "REQUEST_FAILED",
    message:
      error instanceof Error
        ? error.message
        : "Request failed.",
  };
}

function errorStatus(error: unknown): number {
  if (error instanceof HttpError) {
    return error.statusCode;
  }

  if (error instanceof z.ZodError) {
    return 400;
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
      case "API_FAILURE":
        return 502;
      default:
        return 500;
    }
  }

  return 500;
}

const server = http.createServer(
  async (request, response): Promise<void> => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": frontendOrigin,
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-user-id, x-user-role",
        "Access-Control-Allow-Methods":
          "GET, POST, DELETE, OPTIONS",
      });

      response.end();
      return;
    }

    const url = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`,
    );

    const parts = url.pathname.split("/").filter(Boolean);
    const userId = request.headers["x-user-id"]?.toString();
    const userRole = request.headers["x-user-role"]?.toString();

    const requireAuth = (): boolean => {
      if (!userId) {
        sendJson(response, 401, {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please sign in.",
          },
        });

        return false;
      }

      return true;
    };

    const authorizeProject = async (
      projectId: string,
    ) => {
      if (!requireAuth()) {
        return null;
      }

      const project = await getProject(
        projectId,
        userId!,
        userRole,
      );

      if (!project) {
        sendJson(response, 404, {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Project not found.",
          },
        });

        return null;
      }

      return project;
    };

    try {
      // Health check
      if (
        request.method === "GET" &&
        url.pathname === "/api/health"
      ) {
        sendJson(response, 200, {
          success: true,
          data: {
            service: "sitecraft-backend",
            provider: provider.config.provider,
            model: provider.config.model,
            message:
              provider.config.message ||
              "SiteCraft AI engine operational.",
          },
        });

        return;
      }

      // Integration configuration status
      if (
        request.method === "GET" &&
        url.pathname === "/api/config/status"
      ) {
        sendJson(response, 200, {
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
                process.env.GOOGLE_CLIENT_SECRET,
            ),
            unsplash: Boolean(process.env.UNSPLASH_ACCESS_KEY),
            vercel: Boolean(process.env.VERCEL_TOKEN),
            activeProvider: provider.config.provider,
            activeModel: provider.config.model,
          },
        });

        return;
      }

      // List projects
      if (
        request.method === "GET" &&
        url.pathname === "/api/projects"
      ) {
        if (!requireAuth()) return;

        const projects = await listProjects(userId!, userRole);

        sendJson(response, 200, {
          success: true,
          data: projects,
        });

        return;
      }

      // Create project
      if (
        request.method === "POST" &&
        url.pathname === "/api/projects"
      ) {
        if (!requireAuth()) return;

        const input = createProjectSchema.parse(
          await readBody(request),
        );

        const project = await createProject({
          ...input,
          userId: userId!,
        });

        sendJson(response, 201, {
          success: true,
          data: project,
        });

        return;
      }

      // Project routes
      if (
        parts[0] === "api" &&
        parts[1] === "projects" &&
        parts[2]
      ) {
        const projectId = parts[2];

        // Get one project
        if (
          request.method === "GET" &&
          parts.length === 3
        ) {
          const project = await authorizeProject(projectId);
          if (!project) return;

          sendJson(response, 200, {
            success: true,
            data: project,
          });

          return;
        }

        // Delete project
        if (
          request.method === "DELETE" &&
          parts.length === 3
        ) {
          const project = await authorizeProject(projectId);
          if (!project) return;

          const deleted = await deleteProject(projectId);

          if (!deleted) {
            sendJson(response, 404, {
              success: false,
              error: {
                code: "NOT_FOUND",
                message: "Project not found.",
              },
            });

            return;
          }

          sendJson(response, 200, {
            success: true,
            data: { id: projectId },
          });

          return;
        }

        // Generate website
        if (
          request.method === "POST" &&
          parts[3] === "generate"
        ) {
          const project = await authorizeProject(projectId);
          if (!project) return;

          const { prompt } = promptSchema.parse(
            await readBody(request),
          );

          const result = await generateProject(
            projectId,
            prompt,
          );

          sendJson(response, 200, {
            success: true,
            data: result,
          });

          return;
        }

        // Revise website
        if (
          request.method === "POST" &&
          parts[3] === "revise"
        ) {
          const project = await authorizeProject(projectId);
          if (!project) return;

          const { prompt } = promptSchema.parse(
            await readBody(request),
          );

          const result = await reviseProject(
            projectId,
            prompt,
          );

          sendJson(response, 200, {
            success: true,
            data: result,
          });

          return;
        }

        // Export website as ZIP
        if (
          request.method === "GET" &&
          parts[3] === "export"
        ) {
          const project = await authorizeProject(projectId);
          if (!project) return;

          const site = project.websites[0]?.generatedCode;

          if (!site) {
            sendJson(response, 404, {
              success: false,
              error: {
                code: "NOT_READY",
                message: "Generate a website before exporting.",
              },
            });

            return;
          }

          const zip = new JSZip();

          for (const file of site.files) {
            zip.file(file.path, file.content);
          }

          const buffer = await zip.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
          });

          const filename =
            project.name
              .replace(/[^a-z0-9]+/gi, "-")
              .toLowerCase() || "sitecraft-site";

          response.writeHead(200, {
            "Content-Type": "application/zip",
            "Content-Disposition":
              `attachment; filename="${filename}.zip"`,
            "Access-Control-Allow-Origin": frontendOrigin,
          });

          response.end(buffer);
          return;
        }

        // Deploy website
        if (
          request.method === "POST" &&
          parts[3] === "deploy"
        ) {
          const project = await authorizeProject(projectId);
          if (!project) return;

          const site = project.websites[0]?.generatedCode;

          if (!site) {
            sendJson(response, 400, {
              success: false,
              error: {
                code: "NOT_READY",
                message: "Generate a website before deploying.",
              },
            });

            return;
          }

          const deployBody = z
            .object({
              provider: z
                .enum(["vercel", "netlify"])
                .optional()
                .default("vercel"),
            })
            .parse(await readBody(request));

          const deployResult =
            deployBody.provider === "netlify"
              ? await deployToNetlify(
                  project.name,
                  site.files,
                )
              : await deployToVercel(
                  project.name,
                  site.files,
                  process.env.VERCEL_TOKEN,
                  process.env.VERCEL_TEAM_ID,
                );

          if (deployResult.success) {
            await recordDeployment(projectId, {
              provider: deployResult.provider,
              deploymentUrl: deployResult.deploymentUrl,
              deploymentId: deployResult.deploymentId,
              status: deployResult.status,
            });
          }

          sendJson(
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
            },
          );

          return;
        }
      }

      // Route not found
      sendJson(response, 404, {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Route not found.",
        },
      });
    } catch (error: unknown) {
      const failure = errorResponse(error);

      console.error(
        JSON.stringify({
          event: "request_failed",
          path: url.pathname,
          error: failure,
          ...(error instanceof ProviderError
            ? {
                provider: error.provider,
                model: error.model,
                status: error.status,
              }
            : {}),
        }),
      );

      sendJson(response, errorStatus(error), {
        success: false,
        error: failure,
      });
    }
  },
);

// Start server
server.listen(port, () => {
  console.log(
    JSON.stringify({
      event: "backend_started",
      port,
      activeProvider: provider.config.provider,
      model: provider.config.model,
    }),
  );
});

// Graceful shutdown
let isShuttingDown = false;

function handleShutdown(): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down SiteCraft backend...");

  server.close((error) => {
    if (error) {
      console.error("Error while closing server:", error);
      process.exitCode = 1;
    }
  });

  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out.");
    process.exit(1);
  }, 5000);

  forceExit.unref();
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
