
import dotenv from "dotenv";
import path from "node:path";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

type StoreData = {
  projects: any[];
  deployments: any[];
  apiUsage: any[];
};

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const dataDir = path.resolve(
  process.env.SITECRAFT_DATA_DIR ||
    path.join(process.cwd(), ".data")
);
const dataFile = path.join(dataDir, "sitecraft.json");

let prisma: PrismaClient | null = null;

if (process.env.DATABASE_URL) {
  try {
    prisma = new PrismaClient();
  } catch (error) {
    console.warn(
      "Could not instantiate PrismaClient, using local file store:",
      error
    );
  }
}

let dbAvailable = true;
let lastDbCheck = 0;
const DB_RETRY_INTERVAL = 30_000;

function isDbOnline(): boolean {
  if (!prisma || !process.env.DATABASE_URL) {
    return false;
  }

  if (!dbAvailable) {
    if (Date.now() - lastDbCheck > DB_RETRY_INTERVAL) {
      dbAvailable = true;
    } else {
      return false;
    }
  }

  return true;
}

function markDbFailed(error: unknown): void {
  dbAvailable = false;
  lastDbCheck = Date.now();

  const message =
    error instanceof Error ? error.message : String(error);

  console.warn(
    "PostgreSQL unreachable, switching to local file storage:",
    message
  );
}

async function load(): Promise<StoreData> {
  try {
    return JSON.parse(
      await readFile(dataFile, "utf8")
    ) as StoreData;
  } catch {
    return {
      projects: [],
      deployments: [],
      apiUsage: [],
    };
  }
}

async function save(data: StoreData): Promise<void> {
  await mkdir(dataDir, { recursive: true });

  await writeFile(
    dataFile,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function getEmailForUser(userId: string): string {
  const safeUserId = userId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-") || "demo-user";

  return safeUserId.includes("@")
    ? safeUserId
    : `${safeUserId}@sitecraft.local`;
}

function mapWebsite(record: any): any {
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
    qa: generatedCode?.qa,
  };
}

async function ensureUser(userId: string): Promise<string> {
  if (!isDbOnline() || !prisma) {
    return userId;
  }

  try {
    const now = new Date();
    const email = getEmailForUser(userId);

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        id: userId,
        name: userId.split("@")[0] || userId,
        email,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        name: userId.split("@")[0] || userId,
        updatedAt: now,
      },
    });

    return user.id;
  } catch (error) {
    markDbFailed(error);
    return userId;
  }
}

function projectStatusToDb(status: string): string {
  return status.toUpperCase();
}

function projectStatusFromDb(status: string): string {
  return status.toLowerCase();
}

function generationStatusToDb(status: string): string {
  switch (status) {
    case "started":
      return "RUNNING";
    case "completed":
      return "SUCCESS";
    default:
      return "FAILED";
  }
}

function generationStatusFromDb(status: string): string {
  switch (status) {
    case "RUNNING":
      return "started";
    case "SUCCESS":
      return "completed";
    default:
      return "failed";
  }
}

async function listProjectsFromPrisma(
  userId: string,
  role?: string
): Promise<any[]> {
  if (!isDbOnline() || !prisma) {
    return [];
  }

  const projects = await prisma.project.findMany({
    where: role === "admin" ? {} : { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      Website: { orderBy: { version: "desc" } },
      Generation: { orderBy: { createdAt: "desc" } },
      ChatMessage: { orderBy: { createdAt: "asc" } },
      Deployment: { orderBy: { createdAt: "desc" } },
    },
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
      createdAt: generation.createdAt.toISOString(),
    })),

    messages: project.ChatMessage.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),

    deployments: (project.Deployment || []).map((deployment) => ({
      id: deployment.id,
      projectId: deployment.projectId,
      provider: deployment.provider,
      deploymentUrl: deployment.deploymentUrl || undefined,
      deploymentId: deployment.deploymentId || undefined,
      status: deployment.status,
      createdAt: deployment.createdAt.toISOString(),
      updatedAt: deployment.updatedAt.toISOString(),
    })),
  }));
}

async function getProjectFromPrisma(
  id: string,
  userId?: string,
  role?: string
): Promise<any | undefined> {
  if (!isDbOnline() || !prisma) {
    return undefined;
  }

  const where =
    role === "admin"
      ? { id }
      : userId
        ? { id, userId }
        : { id };

  const project = await prisma.project.findFirst({
    where,
    include: {
      Website: { orderBy: { version: "desc" } },
      Generation: { orderBy: { createdAt: "desc" } },
      ChatMessage: { orderBy: { createdAt: "asc" } },
      Deployment: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) {
    return undefined;
  }

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
      createdAt: generation.createdAt.toISOString(),
    })),

    messages: project.ChatMessage.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),

    deployments: (project.Deployment || []).map((deployment) => ({
      id: deployment.id,
      projectId: deployment.projectId,
      provider: deployment.provider,
      deploymentUrl: deployment.deploymentUrl || undefined,
      deploymentId: deployment.deploymentId || undefined,
      status: deployment.status,
      createdAt: deployment.createdAt.toISOString(),
      updatedAt: deployment.updatedAt.toISOString(),
    })),
  };
}

export async function listProjects(
  userId: string = "demo-user",
  role?: string
): Promise<any[]> {
  if (isDbOnline()) {
    try {
      return await listProjectsFromPrisma(userId, role);
    } catch (error) {
      markDbFailed(error);
    }
  }

  const data = await load();

  return data.projects
    .filter(
      (project) =>
        role === "admin" || project.userId === userId
    )
    .sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
}

export async function getProject(
  id: string,
  userId?: string,
  userRole?: string
): Promise<any | undefined> {
  if (isDbOnline()) {
    try {
      const project = await getProjectFromPrisma(
        id,
        userId,
        userRole
      );

      if (project) {
        return project;
      }
    } catch (error) {
      markDbFailed(error);
    }
  }

  const data = await load();

  if (!userId && !userRole) {
    return data.projects.find(
      (project) => project.id === id
    );
  }

  return data.projects.find(
    (project) =>
      project.id === id &&
      (userRole === "admin" || project.userId === userId)
  );
}

export async function createProject(
  input: any
): Promise<any> {
  const now = new Date().toISOString();
  const userId = input.userId || "demo-user";

  if (isDbOnline() && prisma) {
    try {
      const dbUserId = await ensureUser(userId);

      const project = await prisma.project.create({
        data: {
          id: randomUUID(),
          userId: dbUserId,
          name: input.name,
          description: input.description,
          initialPrompt: input.initialPrompt,
          status: projectStatusToDb("draft"),
          framework: "react-tailwind",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
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
        deployments: [],
      };
    } catch (error) {
      markDbFailed(error);
    }
  }

  const data = await load();

  const project = {
    id: randomUUID(),
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
    deployments: [],
  };

  data.projects.push(project);
  await save(data);

  return project;
}

export async function deleteProject(
  id: string
): Promise<boolean> {
  if (isDbOnline() && prisma) {
    try {
      const deleted = await prisma.project.deleteMany({
        where: { id },
      });

      if (deleted.count > 0) {
        return true;
      }
    } catch (error) {
      markDbFailed(error);
    }
  }

  const data = await load();
  const previousCount = data.projects.length;

  data.projects = data.projects.filter(
    (project) => project.id !== id
  );

  const deleted = data.projects.length !== previousCount;

  if (deleted) {
    await save(data);
  }

  return deleted;
}

export async function updateProject(
  id: string,
  patch: any
): Promise<any | undefined> {
  if (isDbOnline() && prisma) {
    try {
      const project = await prisma.project.update({
        where: { id },
        data: {
          ...(patch.status
            ? { status: projectStatusToDb(patch.status) }
            : {}),
          ...(patch.name
            ? { name: patch.name }
            : {}),
          ...(patch.description !== undefined
            ? { description: patch.description }
            : {}),
          updatedAt: new Date(),
        },
      });

      if (project) {
        return await getProjectFromPrisma(project.id);
      }
    } catch (error) {
      markDbFailed(error);
    }
  }

  const data = await load();
  const project = data.projects.find(
    (item) => item.id === id
  );

  if (!project) {
    return undefined;
  }

  Object.assign(project, patch, {
    updatedAt: new Date().toISOString(),
  });

  await save(data);
  return project;
}

export async function addGeneration(
  id: string,
  generation: any
): Promise<any | undefined> {
  if (isDbOnline() && prisma) {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (project) {
        const record = await prisma.generation.create({
          data: {
            id: randomUUID(),
            projectId: id,
            agent: generation.agent,
            userPrompt: generation.userPrompt,
            input: generation.input ?? {},
            output: generation.output ?? {},
            status: generationStatusToDb(generation.status),
            error: generation.error,
            tokenUsage: null,
            createdAt: new Date(),
          },
        });

        await prisma.project.update({
          where: { id },
          data: { updatedAt: new Date() },
        });

        return {
          id: record.id,
          agent: record.agent,
          userPrompt: record.userPrompt,
          status: generationStatusFromDb(record.status),
          input: record.input,
          output: record.output,
          error: record.error || undefined,
          createdAt: record.createdAt.toISOString(),
        };
      }
    } catch (error) {
      markDbFailed(error);
    }
  }

  const data = await load();
  const project = data.projects.find(
    (item) => item.id === id
  );

  if (!project) {
    return undefined;
  }

  if (!project.generations) {
    project.generations = [];
  }

  const record = {
    ...generation,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  project.generations.push(record);
  project.updatedAt = new Date().toISOString();

  await save(data);
  return record;
}

export async function addMessage(
  id: string,
  role: string,
  content: string
): Promise<any | undefined> {
  if (isDbOnline() && prisma) {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (project) {
        const record = await prisma.chatMessage.create({
          data: {
            id: randomUUID(),
            projectId: id,
            role,
            content,
          },
        });

        return {
          id: record.id,
          role: record.role,
          content: record.content,
          createdAt: record.createdAt.toISOString(),
        };
      }
    } catch (error) {
      markDbFailed(error);
    }
  }

  const data = await load();
  const project = data.projects.find(
    (item) => item.id === id
  );

  if (!project) {
    return undefined;
  }

  if (!project.messages) {
    project.messages = [];
  }

  const message = {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };

  project.messages.push(message);
  project.updatedAt = new Date().toISOString();

  await save(data);
  return message;
}

export async function saveWebsite(
  id: string,
  website: any
): Promise<any | undefined> {
  if (isDbOnline() && prisma) {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          Website: {
            orderBy: { version: "desc" },
          },
        },
      });

      if (project) {
        const existing = project.Website[0];
        const now = new Date();

        const record = await prisma.website.create({
          data: {
            id: randomUUID(),
            projectId: id,
            title: website.title,
            description: website.description,
            theme: website.theme,
            colorPalette: website.colorPalette,
            fontFamily: website.fontFamily,
            structure: website.structure,
            generatedCode: website.generatedCode,
            version:
              website.version ?? (existing?.version ?? 0) + 1,
            createdAt: now,
            updatedAt: now,
          },
        });

        await prisma.project.update({
          where: { id },
          data: {
            status: projectStatusToDb("ready"),
            updatedAt: now,
          },
        });

        return mapWebsite(record);
      }
    } catch (error) {
      markDbFailed(error);
    }
  }

  const data = await load();
  const project = data.projects.find(
    (item) => item.id === id
  );

  if (!project) {
    return undefined;
  }

  if (!project.websites) {
    project.websites = [];
  }

  const existing = project.websites[0];
  const now = new Date().toISOString();

  const record = {
    ...website,
    id: existing?.id || randomUUID(),
    projectId: id,
    version:
      website.version ?? (existing?.version ?? 0) + 1,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  project.websites = [record];
  project.status = "ready";
  project.updatedAt = now;

  await save(data);
  return record;
}

export async function recordDeployment(
  projectId: string,
  deployment: any
): Promise<any> {
  const now = new Date();

  if (isDbOnline() && prisma) {
    try {
      const record = await prisma.deployment.create({
        data: {
          id: randomUUID(),
          projectId,
          provider: deployment.provider,
          deploymentUrl: deployment.deploymentUrl || null,
          deploymentId: deployment.deploymentId || null,
          status: deployment.status,
          createdAt: now,
          updatedAt: now,
        },
      });

      return {
        id: record.id,
        projectId: record.projectId,
        provider: record.provider,
        deploymentUrl: record.deploymentUrl || undefined,
        deploymentId: record.deploymentId || undefined,
        status: record.status,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };
    } catch (error) {
      markDbFailed(error);
    }
  }

  const data = await load();

  const record = {
    id: randomUUID(),
    projectId,
    provider: deployment.provider,
    deploymentUrl: deployment.deploymentUrl,
    deploymentId: deployment.deploymentId,
    status: deployment.status,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (!data.deployments) {
    data.deployments = [];
  }

  data.deployments.push(record);

  const project = data.projects.find(
    (item) => item.id === projectId
  );

  if (project) {
    if (!project.deployments) {
      project.deployments = [];
    }

    project.deployments.unshift(record);
  }

  await save(data);
  return record;
}
