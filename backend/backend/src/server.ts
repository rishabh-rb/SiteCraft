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
  listAdminAuditLogs
} from "./store.js";
import { createProjectSchema, promptSchema } from "./validators.js";
import { generateProject, reviseProject } from "./orchestrator.js";
import { deployToVercel } from "./deployment/vercel.js";
import { deployToNetlify } from "./deployment/netlify.js";

// Load .env from workspace or root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const port = Number(process.env.BACKEND_PORT || 4000);
const provider = createProvider();

function sendJson(response: http.ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-role",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
  });
  response.end(JSON.stringify(body));
}

async function readBody(request: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function errorResponse(error: unknown): { code: string; message: string } {
  if (error instanceof z.ZodError) return { code: "INVALID_INPUT", message: error.issues[0]?.message || "Invalid input" };
  if (error instanceof ProviderError) return { code: error.code, message: error.message };
  return { code: "REQUEST_FAILED", message: error instanceof Error ? error.message : "Request failed" };
}

function errorStatus(error: unknown): number {
  if (error instanceof ProviderError) {
    if (error.code === "INVALID_API_KEY") return 401;
    if (error.code === "RATE_LIMIT") return 429;
    if (error.code === "TIMEOUT") return 504;
    if (error.code === "MODEL_UNAVAILABLE") return 503;
    if (error.code === "MALFORMED_RESPONSE") return 502;
    if (error.code === "API_FAILURE") return 502;
  }
  return error instanceof z.ZodError ? 400 : 500;
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "http://localhost:3000",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-role",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
    });
    response.end();
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const userId = request.headers["x-user-id"]?.toString();
  const userRole = request.headers["x-user-role"]?.toString();

  const requireAuth = (): boolean => {
    if (!userId) {
      sendJson(response, 401, { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required. Please sign in." } });
      return false;
    }
    return true;
  };

  const requireAdmin = async (): Promise<boolean> => {
    if (!requireAuth()) return false;
    const role = userRole ? userRole.toUpperCase() : await getUserRole(userId!);
    if (role !== "ADMIN") {
      sendJson(response, 403, { success: false, error: { code: "FORBIDDEN", message: "Admin access required." } });
      return false;
    }
    return true;
  };

  const authorizeProject = async (projectId: string) => {
    if (!requireAuth()) return undefined;
    const project = await getProject(projectId, userId, userRole);
    if (!project) {
      sendJson(response, 404, { success: false, error: { code: "NOT_FOUND", message: "Project not found" } });
    }
    return project;
  };

  try {
    // Health and configuration check endpoint
    if (request.method === "GET" && url.pathname === "/api/health") {
      return sendJson(response, 200, {
        success: true,
        data: {
          service: "sitecraft-backend",
          provider: provider.config.provider,
          model: provider.config.model,
          message: provider.config.message || "SiteCraft AI engine operational."
        }
      });
    }

    // Config integration status for dashboard settings
    if (request.method === "GET" && url.pathname === "/api/config/status") {
      return sendJson(response, 200, {
        success: true,
        data: {
          gemini: Boolean(process.env.GEMINI_API_KEY),
          openai: Boolean(process.env.OPENAI_API_KEY),
          nvidia: Boolean(process.env.NVIDIA_API_KEY),
          bynara: Boolean(process.env.BYNARA_API_KEY),
          database: Boolean(process.env.DATABASE_URL),
          auth: Boolean(process.env.AUTH_SECRET),
          googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
          unsplash: Boolean(process.env.UNSPLASH_ACCESS_KEY),
          vercel: Boolean(process.env.VERCEL_TOKEN),
          activeProvider: provider.config.provider,
          activeModel: provider.config.model
        }
      });
    }

    // -------------------------------------------------------------------------
    // ADMIN API ROUTES (/api/admin/*)
    // -------------------------------------------------------------------------
    if (parts[0] === "api" && parts[1] === "admin") {
      if (!(await requireAdmin())) return;

      const subRoute = parts[2];
      const resourceId = parts[3];
      const action = parts[4];

      // 1. Overview Stats: GET /api/admin/stats
      if (subRoute === "stats" && request.method === "GET") {
        const dateRange = url.searchParams.get("dateRange") || undefined;
        const stats = await getAdminStats(dateRange);
        return sendJson(response, 200, { success: true, data: stats });
      }

      // 2. Recent Activity: GET /api/admin/activity
      if (subRoute === "activity" && request.method === "GET") {
        const limit = Number(url.searchParams.get("limit") || 10);
        const activity = await getAdminRecentActivity(limit);
        return sendJson(response, 200, { success: true, data: activity });
      }

      // 3. Audit Logs: GET /api/admin/audit-logs
      if (subRoute === "audit-logs" && request.method === "GET") {
        const page = Number(url.searchParams.get("page") || 1);
        const pageSize = Number(url.searchParams.get("pageSize") || 20);
        const logs = await listAdminAuditLogs({ page, pageSize });
        return sendJson(response, 200, { success: true, data: logs });
      }

      // 4. Users: GET /api/admin/users, GET /api/admin/users/:id, PATCH /api/admin/users/:id/role
      if (subRoute === "users") {
        if (!resourceId && request.method === "GET") {
          const page = Number(url.searchParams.get("page") || 1);
          const pageSize = Number(url.searchParams.get("pageSize") || 20);
          const search = url.searchParams.get("search") || undefined;
          const role = url.searchParams.get("role") || undefined;
          const dateRange = url.searchParams.get("dateRange") || undefined;
          const users = await listAdminUsers({ page, pageSize, search, role, dateRange });
          return sendJson(response, 200, { success: true, data: users });
        }

        if (resourceId && !action && request.method === "GET") {
          const user = await getAdminUserDetail(resourceId);
          if (!user) return sendJson(response, 404, { success: false, error: { code: "NOT_FOUND", message: "User not found" } });
          return sendJson(response, 200, { success: true, data: user });
        }

        if (resourceId && action === "role" && request.method === "PATCH") {
          const body = (await readBody(request)) as { role?: "USER" | "ADMIN" };
          if (!body?.role || !["USER", "ADMIN"].includes(body.role)) {
            return sendJson(response, 400, { success: false, error: { code: "INVALID_ROLE", message: "Role must be USER or ADMIN" } });
          }
          const result = await updateUserRole(userId!, resourceId, body.role);
          if (!result.success) {
            return sendJson(response, 400, { success: false, error: { code: "UPDATE_FAILED", message: result.error || "Failed to update role" } });
          }
          return sendJson(response, 200, { success: true, data: result.user });
        }
      }

      // 5. Projects: GET /api/admin/projects, GET /api/admin/projects/:id
      if (subRoute === "projects") {
        if (!resourceId && request.method === "GET") {
          const page = Number(url.searchParams.get("page") || 1);
          const pageSize = Number(url.searchParams.get("pageSize") || 20);
          const search = url.searchParams.get("search") || undefined;
          const status = url.searchParams.get("status") || undefined;
          const framework = url.searchParams.get("framework") || undefined;
          const uId = url.searchParams.get("userId") || undefined;
          const dateRange = url.searchParams.get("dateRange") || undefined;
          const projects = await listAdminProjects({ page, pageSize, search, status, framework, userId: uId, dateRange });
          return sendJson(response, 200, { success: true, data: projects });
        }

        if (resourceId && request.method === "GET") {
          const project = await getAdminProjectDetail(resourceId);
          if (!project) return sendJson(response, 404, { success: false, error: { code: "NOT_FOUND", message: "Project not found" } });
          return sendJson(response, 200, { success: true, data: project });
        }
      }

      // 6. Websites: GET /api/admin/websites, GET /api/admin/websites/:id
      if (subRoute === "websites") {
        if (!resourceId && request.method === "GET") {
          const page = Number(url.searchParams.get("page") || 1);
          const pageSize = Number(url.searchParams.get("pageSize") || 20);
          const search = url.searchParams.get("search") || undefined;
          const theme = url.searchParams.get("theme") || undefined;
          const websites = await listAdminWebsites({ page, pageSize, search, theme });
          return sendJson(response, 200, { success: true, data: websites });
        }

        if (resourceId && request.method === "GET") {
          const website = await getAdminWebsiteDetail(resourceId);
          if (!website) return sendJson(response, 404, { success: false, error: { code: "NOT_FOUND", message: "Website not found" } });
          return sendJson(response, 200, { success: true, data: website });
        }
      }

      // 7. Generations: GET /api/admin/generations, GET /api/admin/generations/:id
      if (subRoute === "generations") {
        if (!resourceId && request.method === "GET") {
          const page = Number(url.searchParams.get("page") || 1);
          const pageSize = Number(url.searchParams.get("pageSize") || 20);
          const search = url.searchParams.get("search") || undefined;
          const agent = url.searchParams.get("agent") || undefined;
          const status = url.searchParams.get("status") || undefined;
          const pId = url.searchParams.get("projectId") || undefined;
          const uId = url.searchParams.get("userId") || undefined;
          const dateRange = url.searchParams.get("dateRange") || undefined;
          const generations = await listAdminGenerations({ page, pageSize, search, agent, status, projectId: pId, userId: uId, dateRange });
          return sendJson(response, 200, { success: true, data: generations });
        }

        if (resourceId && request.method === "GET") {
          const generation = await getAdminGenerationDetail(resourceId);
          if (!generation) return sendJson(response, 404, { success: false, error: { code: "NOT_FOUND", message: "Generation not found" } });
          return sendJson(response, 200, { success: true, data: generation });
        }
      }

      // 8. AI Usage: GET /api/admin/usage
      if (subRoute === "usage" && request.method === "GET") {
        const page = Number(url.searchParams.get("page") || 1);
        const pageSize = Number(url.searchParams.get("pageSize") || 20);
        const pProvider = url.searchParams.get("provider") || undefined;
        const model = url.searchParams.get("model") || undefined;
        const uId = url.searchParams.get("userId") || undefined;
        const dateRange = url.searchParams.get("dateRange") || undefined;
        const usage = await getAdminUsageAnalytics({ page, pageSize, provider: pProvider, model, userId: uId, dateRange });
        return sendJson(response, 200, { success: true, data: usage });
      }

      // 9. Deployments: GET /api/admin/deployments
      if (subRoute === "deployments" && request.method === "GET") {
        const page = Number(url.searchParams.get("page") || 1);
        const pageSize = Number(url.searchParams.get("pageSize") || 20);
        const pProvider = url.searchParams.get("provider") || undefined;
        const status = url.searchParams.get("status") || undefined;
        const search = url.searchParams.get("search") || undefined;
        const deployments = await listAdminDeployments({ page, pageSize, provider: pProvider, status, search });
        return sendJson(response, 200, { success: true, data: deployments });
      }

      // 10. Chats: GET /api/admin/chats
      if (subRoute === "chats" && request.method === "GET") {
        const page = Number(url.searchParams.get("page") || 1);
        const pageSize = Number(url.searchParams.get("pageSize") || 20);
        const search = url.searchParams.get("search") || undefined;
        const pId = url.searchParams.get("projectId") || undefined;
        const chats = await listAdminChats({ page, pageSize, search, projectId: pId });
        return sendJson(response, 200, { success: true, data: chats });
      }
    }

    // -------------------------------------------------------------------------
    // STANDARD USER API ROUTES
    // -------------------------------------------------------------------------
    if (request.method === "GET" && url.pathname === "/api/projects") {
      if (!requireAuth()) return;
      const projects = await listProjects(userId!, userRole);
      return sendJson(response, 200, { success: true, data: projects });
    }

    if (request.method === "POST" && url.pathname === "/api/projects") {
      if (!requireAuth()) return;
      const body = createProjectSchema.parse(await readBody(request));
      const project = await createProject({
        userId: userId!,
        name: body.name,
        description: body.description,
        initialPrompt: body.initialPrompt,
        framework: body.framework
      });
      return sendJson(response, 201, { success: true, data: project });
    }

    if (parts[0] === "api" && parts[1] === "projects" && parts[2]) {
      const projectId = parts[2];
      const action = parts[3];

      if (!action) {
        if (request.method === "GET") {
          const project = await authorizeProject(projectId);
          if (!project) return;
          return sendJson(response, 200, { success: true, data: project });
        }
        if (request.method === "DELETE") {
          const project = await authorizeProject(projectId);
          if (!project) return;
          await deleteProject(projectId);
          return sendJson(response, 200, { success: true, data: { id: projectId } });
        }
      }

      if (request.method === "POST" && action === "generate") {
        const project = await authorizeProject(projectId);
        if (!project) return;
        const body = promptSchema.parse(await readBody(request));
        const result = await generateProject(projectId, body.prompt);
        // Track API usage metrics for admin telemetry
        await recordApiUsage(userId!, result.provider || "gemini", "gemini-3.6-flash", 1250);
        return sendJson(response, 200, { success: true, data: result });
      }

      if (request.method === "POST" && action === "revise") {
        const project = await authorizeProject(projectId);
        if (!project) return;
        const body = promptSchema.parse(await readBody(request));
        const result = await reviseProject(projectId, body.prompt);
        await recordApiUsage(userId!, "gemini", "gemini-3.6-flash", 650);
        return sendJson(response, 200, { success: true, data: result });
      }

      if (request.method === "GET" && action === "export") {
        const project = await authorizeProject(projectId);
        if (!project) return;
        const website = project.websites[0];
        if (!website) return sendJson(response, 400, { success: false, error: { code: "NO_WEBSITE", message: "Generate a website first" } });

        const zip = new JSZip();
        for (const file of website.generatedCode.files) {
          zip.file(file.path, file.content);
        }
        zip.file("dist/index.html", website.generatedCode.html);

        const archive = await zip.generateAsync({ type: "nodebuffer" });
        response.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-site.zip"`,
          "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "http://localhost:3000"
        });
        response.end(archive);
        return;
      }

      if (request.method === "POST" && action === "deploy") {
        const project = await authorizeProject(projectId);
        if (!project) return;
        const body = (await readBody(request)) as { provider?: string };
        const deployProvider = body.provider || "vercel";
        const latestWebsite = project.websites[0];

        if (!latestWebsite) {
          return sendJson(response, 400, {
            success: false,
            error: { code: "NO_WEBSITE", message: "Cannot deploy a project without generated website code." }
          });
        }

        let deployResult;
        if (deployProvider === "netlify") {
          deployResult = await deployToNetlify(project.name, latestWebsite.generatedCode);
        } else {
          deployResult = await deployToVercel(project.name, latestWebsite.generatedCode);
        }

        if (deployResult.success) {
          await recordDeployment(projectId, {
            provider: deployResult.provider,
            deploymentUrl: deployResult.deploymentUrl,
            deploymentId: deployResult.deploymentId,
            status: deployResult.status
          });
        }

        return sendJson(response, deployResult.success ? 200 : 400, {
          success: deployResult.success,
          data: deployResult,
          ...(deployResult.error ? { error: { code: "DEPLOYMENT_FAILED", message: deployResult.error } } : {})
        });
      }
    }

    return sendJson(response, 404, { success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
  } catch (error) {
    const failure = errorResponse(error);
    console.error(JSON.stringify({
      event: "request_failed",
      path: url.pathname,
      error: failure,
      ...(error instanceof ProviderError ? { provider: error.provider, model: error.model, status: error.status } : {})
    }));
    return sendJson(response, errorStatus(error), { success: false, error: failure });
  }
});

server.listen(port, () => {
  console.log(JSON.stringify({
    event: "backend_started",
    port,
    activeProvider: provider.config.provider,
    model: provider.config.model
  }));
});

const handleShutdown = () => {
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1000).unref();
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
