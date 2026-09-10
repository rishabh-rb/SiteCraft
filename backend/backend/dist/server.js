"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const node_path_1 = __importDefault(require("node:path"));
const node_http_1 = __importDefault(require("node:http"));
const node_url_1 = require("node:url");
const jszip_1 = __importDefault(require("jszip"));
const zod_1 = require("zod");
const ml_1 = require("@sitecraft/ml");
const store_js_1 = require("./store.js");
const validators_js_1 = require("./validators.js");
const orchestrator_js_1 = require("./orchestrator.js");
const vercel_js_1 = require("./deployment/vercel.js");
const netlify_js_1 = require("./deployment/netlify.js");
// Load .env from workspace or root
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), ".env") });
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), "../.env") });
const port = Number(process.env.BACKEND_PORT || 4000);
const provider = (0, ml_1.createProvider)();
function sendJson(response, status, body) {
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "http://localhost:3000",
        "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-role",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
    });
    response.end(JSON.stringify(body));
}
async function readBody(request) {
    const chunks = [];
    for await (const chunk of request)
        chunks.push(Buffer.from(chunk));
    if (!chunks.length)
        return {};
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    }
    catch {
        throw new Error("Invalid JSON body");
    }
}
function errorResponse(error) {
    if (error instanceof zod_1.z.ZodError)
        return { code: "INVALID_INPUT", message: error.issues[0]?.message || "Invalid input" };
    if (error instanceof ml_1.ProviderError)
        return { code: error.code, message: error.message };
    return { code: "REQUEST_FAILED", message: error instanceof Error ? error.message : "Request failed" };
}
function errorStatus(error) {
    if (error instanceof ml_1.ProviderError) {
        if (error.code === "INVALID_API_KEY")
            return 401;
        if (error.code === "RATE_LIMIT")
            return 429;
        if (error.code === "TIMEOUT")
            return 504;
        if (error.code === "MODEL_UNAVAILABLE")
            return 503;
        if (error.code === "MALFORMED_RESPONSE")
            return 502;
        if (error.code === "API_FAILURE")
            return 502;
    }
    return error instanceof zod_1.z.ZodError ? 400 : 500;
}
const server = node_http_1.default.createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
        response.writeHead(204, {
            "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "http://localhost:3000",
            "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-role",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
        });
        response.end();
        return;
    }
    const url = new node_url_1.URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const parts = url.pathname.split("/").filter(Boolean);
    const userId = request.headers["x-user-id"]?.toString();
    const userRole = request.headers["x-user-role"]?.toString();
    const requireAuth = () => {
        if (!userId) {
            sendJson(response, 401, { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required. Please sign in." } });
            return false;
        }
        return true;
    };
    const authorizeProject = async (projectId) => {
        if (!requireAuth())
            return undefined;
        const project = await (0, store_js_1.getProject)(projectId, userId, userRole);
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
        // List projects
        if (request.method === "GET" && url.pathname === "/api/projects") {
            if (!requireAuth())
                return;
            return sendJson(response, 200, { success: true, data: await (0, store_js_1.listProjects)(userId, userRole) });
        }
        // Create project
        if (request.method === "POST" && url.pathname === "/api/projects") {
            if (!requireAuth())
                return;
            const input = validators_js_1.createProjectSchema.parse(await readBody(request));
            return sendJson(response, 201, { success: true, data: await (0, store_js_1.createProject)({ ...input, userId }) });
        }
        // Project subroutes
        if (parts[0] === "api" && parts[1] === "projects" && parts[2]) {
            const projectId = parts[2];
            // Get single project
            if (request.method === "GET" && parts.length === 3) {
                const project = await authorizeProject(projectId);
                if (!project)
                    return;
                return sendJson(response, 200, { success: true, data: project });
            }
            // Delete project
            if (request.method === "DELETE" && parts.length === 3) {
                const project = await authorizeProject(projectId);
                if (!project)
                    return;
                return sendJson(response, (await (0, store_js_1.deleteProject)(projectId)) ? 200 : 404, { success: true, data: { id: projectId } });
            }
            // Generate website via multi-agent pipeline
            if (request.method === "POST" && parts[3] === "generate") {
                const project = await authorizeProject(projectId);
                if (!project)
                    return;
                const { prompt } = validators_js_1.promptSchema.parse(await readBody(request));
                const result = await (0, orchestrator_js_1.generateProject)(projectId, prompt);
                return sendJson(response, 200, { success: true, data: result });
            }
            // Revise website via conversational edits
            if (request.method === "POST" && parts[3] === "revise") {
                const project = await authorizeProject(projectId);
                if (!project)
                    return;
                const { prompt } = validators_js_1.promptSchema.parse(await readBody(request));
                const result = await (0, orchestrator_js_1.reviseProject)(projectId, prompt);
                return sendJson(response, 200, { success: true, data: result });
            }
            // Export project as ZIP
            if (request.method === "GET" && parts[3] === "export") {
                const project = await authorizeProject(projectId);
                if (!project)
                    return;
                const site = project?.websites[0]?.generatedCode;
                if (!site) {
                    return sendJson(response, 404, { success: false, error: { code: "NOT_READY", message: "Generate a website before exporting." } });
                }
                const zip = new jszip_1.default();
                for (const file of site.files) {
                    zip.file(file.path, file.content);
                }
                const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
                response.writeHead(200, {
                    "Content-Type": "application/zip",
                    "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "sitecraft-site"}.zip"`,
                    "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "http://localhost:3000"
                });
                response.end(buffer);
                return;
            }
            // Deploy website to Vercel or Netlify
            if (request.method === "POST" && parts[3] === "deploy") {
                const project = await authorizeProject(projectId);
                if (!project)
                    return;
                const site = project?.websites[0]?.generatedCode;
                if (!site) {
                    return sendJson(response, 400, { success: false, error: { code: "NOT_READY", message: "Generate a website before deploying." } });
                }
                const body = (await readBody(request));
                const providerName = (body.provider || "vercel").toLowerCase();
                let deployResult;
                if (providerName === "netlify") {
                    deployResult = await (0, netlify_js_1.deployToNetlify)(project.name, site.files);
                }
                else {
                    deployResult = await (0, vercel_js_1.deployToVercel)(project.name, site.files, process.env.VERCEL_TOKEN, process.env.VERCEL_TEAM_ID);
                }
                if (deployResult.success) {
                    await (0, store_js_1.recordDeployment)(projectId, {
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
    }
    catch (error) {
        const failure = errorResponse(error);
        console.error(JSON.stringify({
            event: "request_failed",
            path: url.pathname,
            error: failure,
            ...(error instanceof ml_1.ProviderError ? { provider: error.provider, model: error.model, status: error.status } : {})
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
