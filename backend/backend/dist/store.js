"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProjects = listProjects;
exports.getProject = getProject;
exports.createProject = createProject;
exports.deleteProject = deleteProject;
exports.updateProject = updateProject;
exports.addGeneration = addGeneration;
exports.addMessage = addMessage;
exports.saveWebsite = saveWebsite;
exports.recordDeployment = recordDeployment;
const dotenv_1 = __importDefault(require("dotenv"));
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:fs/promises");
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
// Load .env from current directory or parent directory
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), ".env") });
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), "../.env") });
const dataDir = node_path_1.default.resolve(process.env.SITECRAFT_DATA_DIR || node_path_1.default.join(process.cwd(), ".data"));
const dataFile = node_path_1.default.join(dataDir, "sitecraft.json");
let prisma = null;
if (process.env.DATABASE_URL) {
    try {
        prisma = new client_1.PrismaClient();
    }
    catch (error) {
        console.warn("Could not instantiate PrismaClient, using local file store:", error);
    }
}
let dbAvailable = true;
let lastDbCheck = 0;
const DB_RETRY_INTERVAL = 30_000;
function isDbOnline() {
    if (!prisma || !process.env.DATABASE_URL)
        return false;
    if (!dbAvailable) {
        if (Date.now() - lastDbCheck > DB_RETRY_INTERVAL) {
            dbAvailable = true;
        }
        else {
            return false;
        }
    }
    return true;
}
function markDbFailed(err) {
    dbAvailable = false;
    lastDbCheck = Date.now();
    console.warn("PostgreSQL unreachable, switching to resilient local file storage:", err.message);
}
async function load() {
    try {
        return JSON.parse(await (0, promises_1.readFile)(dataFile, "utf8"));
    }
    catch {
        return { projects: [], deployments: [], apiUsage: [] };
    }
}
async function save(data) {
    await (0, promises_1.mkdir)(dataDir, { recursive: true });
    await (0, promises_1.writeFile)(dataFile, JSON.stringify(data, null, 2));
}
function getEmailForUser(userId) {
    const safeUserId = userId.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-") || "demo-user";
    return safeUserId.includes("@") ? safeUserId : `${safeUserId}@sitecraft.local`;
}
function mapWebsite(record) {
    const generatedCode = record.generatedCode;
    return {
        id: record.id,
        projectId: record.projectId,
        title: record.title,
        description: record.description || "",
        theme: record.theme,
        colorPalette: record.colorPalette,
        fontFamily: record.fontFamily,
        structure: record.structure,
        generatedCode,
        version: record.version,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        qa: generatedCode?.qa
    };
}
async function ensureUser(userId) {
    if (!isDbOnline() || !prisma)
        return userId;
    try {
        const now = new Date();
        const email = getEmailForUser(userId);
        const user = await prisma.user.upsert({
            where: { email },
            create: { id: userId, name: userId.split("@")[0] || userId, email, createdAt: now, updatedAt: now },
            update: { name: userId.split("@")[0] || userId, updatedAt: now }
        });
        return user.id;
    }
    catch (err) {
        markDbFailed(err);
        return userId;
    }
}
function projectStatusToDb(status) {
    return status.toUpperCase();
}
function projectStatusFromDb(status) {
    return status.toLowerCase();
}
function generationStatusToDb(status) {
    switch (status) {
        case "started":
            return "RUNNING";
        case "completed":
            return "SUCCESS";
        default:
            return "FAILED";
    }
}
function generationStatusFromDb(status) {
    switch (status) {
        case "RUNNING":
            return "started";
        case "SUCCESS":
            return "completed";
        default:
            return "failed";
    }
}
async function listProjectsFromPrisma(userId, role) {
    if (!isDbOnline() || !prisma)
        return [];
    const projects = await prisma.project.findMany({
        where: role === "admin" ? {} : { userId },
        orderBy: { updatedAt: "desc" },
        include: {
            Website: { orderBy: { version: "desc" } },
            Generation: { orderBy: { createdAt: "desc" } },
            ChatMessage: { orderBy: { createdAt: "asc" } },
            Deployment: { orderBy: { createdAt: "desc" } }
        }
    });
    return projects.map((project) => ({
        id: project.id,
        userId: project.userId,
        name: project.name,
        description: project.description || "",
        initialPrompt: project.initialPrompt,
        status: projectStatusFromDb(project.status),
        framework: project.framework,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        websites: project.Website.map(mapWebsite),
        generations: project.Generation.map((generation) => ({
            id: generation.id,
            agent: generation.agent,
            userPrompt: generation.userPrompt,
            status: generationStatusFromDb(generation.status),
            input: generation.input,
            output: generation.output,
            error: generation.error || undefined,
            createdAt: generation.createdAt.toISOString()
        })),
        messages: project.ChatMessage.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt.toISOString()
        })),
        deployments: (project.Deployment || []).map((dep) => ({
            id: dep.id,
            projectId: dep.projectId,
            provider: dep.provider,
            deploymentUrl: dep.deploymentUrl || undefined,
            deploymentId: dep.deploymentId || undefined,
            status: dep.status,
            createdAt: dep.createdAt.toISOString(),
            updatedAt: dep.updatedAt.toISOString()
        }))
    }));
}
async function getProjectFromPrisma(id, userId, role) {
    if (!isDbOnline() || !prisma)
        return undefined;
    const isAdmin = role === "admin";
    const where = isAdmin ? { id } : userId ? { id, userId } : { id };
    const project = await prisma.project.findFirst({
        where,
        include: {
            Website: { orderBy: { version: "desc" } },
            Generation: { orderBy: { createdAt: "desc" } },
            ChatMessage: { orderBy: { createdAt: "asc" } },
            Deployment: { orderBy: { createdAt: "desc" } }
        }
    });
    if (!project)
        return undefined;
    return {
        id: project.id,
        userId: project.userId,
        name: project.name,
        description: project.description || "",
        initialPrompt: project.initialPrompt,
        status: projectStatusFromDb(project.status),
        framework: project.framework,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        websites: project.Website.map(mapWebsite),
        generations: project.Generation.map((generation) => ({
            id: generation.id,
            agent: generation.agent,
            userPrompt: generation.userPrompt,
            status: generationStatusFromDb(generation.status),
            input: generation.input,
            output: generation.output,
            error: generation.error || undefined,
            createdAt: generation.createdAt.toISOString()
        })),
        messages: project.ChatMessage.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt.toISOString()
        })),
        deployments: (project.Deployment || []).map((dep) => ({
            id: dep.id,
            projectId: dep.projectId,
            provider: dep.provider,
            deploymentUrl: dep.deploymentUrl || undefined,
            deploymentId: dep.deploymentId || undefined,
            status: dep.status,
            createdAt: dep.createdAt.toISOString(),
            updatedAt: dep.updatedAt.toISOString()
        }))
    };
}
async function listProjects(userId = "demo-user", role) {
    if (isDbOnline()) {
        try {
            return await listProjectsFromPrisma(userId, role);
        }
        catch (err) {
            markDbFailed(err);
        }
    }
    const data = await load();
    return (data.projects || [])
        .filter((project) => role === "admin" || project.userId === userId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
async function getProject(id, userId, userRole) {
    if (isDbOnline()) {
        try {
            const p = await getProjectFromPrisma(id, userId, userRole);
            if (p)
                return p;
        }
        catch (err) {
            markDbFailed(err);
        }
    }
    const data = await load();
    if (!userId && !userRole) {
        return (data.projects || []).find((project) => project.id === id);
    }
    return (data.projects || []).find((project) => project.id === id && (userRole === "admin" || project.userId === userId));
}
async function createProject(input) {
    const now = new Date().toISOString();
    const userId = input.userId || "demo-user";
    if (isDbOnline() && prisma) {
        try {
            const dbUserId = await ensureUser(userId);
            const project = await prisma.project.create({
                data: {
                    id: (0, node_crypto_1.randomUUID)(),
                    userId: dbUserId,
                    name: input.name,
                    description: input.description,
                    initialPrompt: input.initialPrompt,
                    status: projectStatusToDb("draft"),
                    framework: "react-tailwind",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            return {
                id: project.id,
                userId: project.userId,
                name: project.name,
                description: project.description || "",
                initialPrompt: project.initialPrompt,
                status: projectStatusFromDb(project.status),
                framework: project.framework,
                createdAt: project.createdAt.toISOString(),
                updatedAt: project.updatedAt.toISOString(),
                websites: [],
                generations: [],
                messages: [],
                deployments: []
            };
        }
        catch (err) {
            markDbFailed(err);
        }
    }
    const data = await load();
    if (!data.projects)
        data.projects = [];
    const project = {
        id: (0, node_crypto_1.randomUUID)(),
        userId,
        name: input.name,
        description: input.description,
        initialPrompt: input.initialPrompt,
        status: "draft",
        framework: "react-tailwind",
        createdAt: now,
        updatedAt: now,
        websites: [],
        generations: [],
        messages: [],
        deployments: []
    };
    data.projects.push(project);
    await save(data);
    return project;
}
async function deleteProject(id) {
    if (isDbOnline() && prisma) {
        try {
            const deleted = await prisma.project.deleteMany({ where: { id } });
            if (deleted.count > 0)
                return true;
        }
        catch (err) {
            markDbFailed(err);
        }
    }
    const data = await load();
    const before = (data.projects || []).length;
    data.projects = (data.projects || []).filter((project) => project.id !== id);
    if (data.projects.length !== before)
        await save(data);
    return data.projects.length !== before;
}
async function updateProject(id, patch) {
    if (isDbOnline() && prisma) {
        try {
            const project = await prisma.project.update({
                where: { id },
                data: {
                    ...(patch.status ? { status: projectStatusToDb(patch.status) } : {}),
                    ...(patch.name ? { name: patch.name } : {}),
                    ...(patch.description !== undefined ? { description: patch.description } : {}),
                    updatedAt: new Date()
                }
            });
            if (project)
                return await getProjectFromPrisma(project.id);
        }
        catch (err) {
            markDbFailed(err);
        }
    }
    const data = await load();
    const project = (data.projects || []).find((item) => item.id === id);
    if (!project)
        return undefined;
    Object.assign(project, patch, { updatedAt: new Date().toISOString() });
    await save(data);
    return project;
}
async function addGeneration(id, generation) {
    if (isDbOnline() && prisma) {
        try {
            const project = await prisma.project.findUnique({ where: { id } });
            if (project) {
                const record = await prisma.generation.create({
                    data: {
                        id: (0, node_crypto_1.randomUUID)(),
                        projectId: id,
                        agent: generation.agent,
                        userPrompt: generation.userPrompt,
                        input: (generation.input ?? {}),
                        output: (generation.output ?? {}),
                        status: generationStatusToDb(generation.status),
                        error: generation.error,
                        tokenUsage: null,
                        createdAt: new Date()
                    }
                });
                await prisma.project.update({ where: { id }, data: { updatedAt: new Date() } });
                return {
                    id: record.id,
                    agent: record.agent,
                    userPrompt: record.userPrompt,
                    status: generationStatusFromDb(record.status),
                    input: record.input,
                    output: record.output,
                    error: record.error || undefined,
                    createdAt: record.createdAt.toISOString()
                };
            }
        }
        catch (err) {
            markDbFailed(err);
        }
    }
    const data = await load();
    const project = (data.projects || []).find((item) => item.id === id);
    if (!project)
        return undefined;
    if (!project.generations)
        project.generations = [];
    const record = { ...generation, id: (0, node_crypto_1.randomUUID)(), createdAt: new Date().toISOString() };
    project.generations.push(record);
    project.updatedAt = new Date().toISOString();
    await save(data);
    return record;
}
async function addMessage(id, role, content) {
    if (isDbOnline() && prisma) {
        try {
            const project = await prisma.project.findUnique({ where: { id } });
            if (project) {
                const record = await prisma.chatMessage.create({
                    data: { id: (0, node_crypto_1.randomUUID)(), projectId: id, role, content }
                });
                return {
                    id: record.id,
                    role: record.role,
                    content: record.content,
                    createdAt: record.createdAt.toISOString()
                };
            }
        }
        catch (err) {
            markDbFailed(err);
        }
    }
    const data = await load();
    const project = (data.projects || []).find((item) => item.id === id);
    if (!project)
        return undefined;
    if (!project.messages)
        project.messages = [];
    const message = { id: (0, node_crypto_1.randomUUID)(), role, content, createdAt: new Date().toISOString() };
    project.messages.push(message);
    project.updatedAt = new Date().toISOString();
    await save(data);
    return message;
}
async function saveWebsite(id, website) {
    if (isDbOnline() && prisma) {
        try {
            const project = await prisma.project.findUnique({ where: { id }, include: { Website: { orderBy: { version: "desc" } } } });
            if (project) {
                const existing = project.Website[0];
                const now = new Date();
                const record = await prisma.website.create({
                    data: {
                        id: (0, node_crypto_1.randomUUID)(),
                        projectId: id,
                        title: website.title,
                        description: website.description,
                        theme: website.theme,
                        colorPalette: website.colorPalette,
                        fontFamily: website.fontFamily,
                        structure: website.structure,
                        generatedCode: website.generatedCode,
                        version: website.version ?? (existing?.version ?? 0) + 1,
                        createdAt: now,
                        updatedAt: now
                    }
                });
                await prisma.project.update({ where: { id }, data: { status: projectStatusToDb("ready"), updatedAt: now } });
                return mapWebsite(record);
            }
        }
        catch (err) {
            markDbFailed(err);
        }
    }
    const data = await load();
    const project = (data.projects || []).find((item) => item.id === id);
    if (!project)
        return undefined;
    if (!project.websites)
        project.websites = [];
    const existing = project.websites[0];
    const now = new Date().toISOString();
    const record = {
        ...website,
        id: existing?.id || (0, node_crypto_1.randomUUID)(),
        projectId: id,
        version: website.version ?? (existing?.version ?? 0) + 1,
        createdAt: existing?.createdAt || now,
        updatedAt: now
    };
    project.websites = [record];
    project.status = "ready";
    project.updatedAt = now;
    await save(data);
    return record;
}
async function recordDeployment(projectId, deployment) {
    const now = new Date();
    if (isDbOnline() && prisma) {
        try {
            const record = await prisma.deployment.create({
                data: {
                    id: (0, node_crypto_1.randomUUID)(),
                    projectId,
                    provider: deployment.provider,
                    deploymentUrl: deployment.deploymentUrl || null,
                    deploymentId: deployment.deploymentId || null,
                    status: deployment.status,
                    createdAt: now,
                    updatedAt: now
                }
            });
            return {
                id: record.id,
                projectId: record.projectId,
                provider: record.provider,
                deploymentUrl: record.deploymentUrl || undefined,
                deploymentId: record.deploymentId || undefined,
                status: record.status,
                createdAt: record.createdAt.toISOString(),
                updatedAt: record.updatedAt.toISOString()
            };
        }
        catch (err) {
            markDbFailed(err);
        }
    }
    const data = await load();
    const record = {
        id: (0, node_crypto_1.randomUUID)(),
        projectId,
        provider: deployment.provider,
        deploymentUrl: deployment.deploymentUrl,
        deploymentId: deployment.deploymentId,
        status: deployment.status,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
    };
    if (!data.deployments)
        data.deployments = [];
    data.deployments.push(record);
    const proj = (data.projects || []).find((p) => p.id === projectId);
    if (proj) {
        if (!proj.deployments)
            proj.deployments = [];
        proj.deployments.unshift(record);
    }
    await save(data);
    return record;
}
