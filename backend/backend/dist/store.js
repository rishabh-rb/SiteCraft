
import dotenv from "dotenv";
import path from "node:path";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  rm,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});
dotenv.config({
  path: path.resolve(process.cwd(), "../.env"),
});

// ==================================================
// TYPES
// ==================================================

type StoreRecord = Record<string, any>;

type StoreData = {
  projects: StoreRecord[];
  deployments: StoreRecord[];
  apiUsage: StoreRecord[];
};

type ProjectInput = {
  userId?: string;
  name: string;
  description?: string;
  initialPrompt: string;
};

type DeploymentInput = {
  provider: string;
  deploymentUrl?: string;
  deploymentId?: string;
  status: string;
};

type GenerationInput = {
  agent: string;
  userPrompt: string;
  status: string;
  input?: unknown;
  output?: unknown;
  error?: string;
};

type WebsiteInput = {
  title: string;
  description?: string;
  theme?: string;
  colorPalette?: unknown;
  fontFamily?: string;
  structure?: unknown;
  generatedCode?: unknown;
  version?: number;
};

type ProjectPatch = Partial<
  Pick<ProjectInput, "name" | "description">
> & {
  status?: string;
};

// ==================================================
// CONFIGURATION
// ==================================================

const dataDir = path.resolve(
  process.env.SITECRAFT_DATA_DIR ||
    path.join(process.cwd(), ".data")
);

const dataFile = path.join(dataDir, "sitecraft.json");

let prisma: PrismaClient | null = null;

if (process.env.DATABASE_URL) {
  prisma = new PrismaClient();
}

let dbAvailable = true;
let lastDbCheck = 0;

const DB_RETRY_INTERVAL = 30_000;

// ==================================================
// DATABASE HELPERS
// ==================================================

function isDbOnline(): boolean {
  if (!prisma || !process.env.DATABASE_URL) {
    return false;
  }

  if (!dbAvailable) {
    if (Date.now() - lastDbCheck < DB_RETRY_INTERVAL) {
      return false;
    }

    dbAvailable = true;
  }

  return true;
}

function markDbFailed(error: unknown): void {
  dbAvailable = false;
  lastDbCheck = Date.now();

  console.error(
    "Database operation failed:",
    error instanceof Error ? error.message : String(error)
  );
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

// ==================================================
// LOCAL JSON STORAGE
// ==================================================

function emptyStore(): StoreData {
  return {
    projects: [],
    deployments: [],
    apiUsage: [],
  };
}

function isRecord(value: unknown): value is StoreRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

async function load(): Promise<StoreData> {
  let raw: string;

  try {
    raw = await readFile(dataFile, "utf8");
  } catch (error) {
    if (
      isRecord(error) &&
      error.code === "ENOENT"
    ) {
      return emptyStore();
    }

    throw error;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `The SiteCraft data file contains invalid JSON: ${dataFile}`
    );
  }

  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.projects)
  ) {
    throw new Error(
      "Invalid SiteCraft store structure. Expected a projects array."
    );
  }

  return {
    projects: parsed.projects,
    deployments: Array.isArray(parsed.deployments)
      ? parsed.deployments
      : [],
    apiUsage: Array.isArray(parsed.apiUsage)
      ? parsed.apiUsage
      : [],
  };
}

async function save(data: StoreData): Promise<void> {
  await mkdir(dataDir, { recursive: true });

  const tempFile = `${dataFile}.${randomUUID()}.tmp`;

  try {
    await writeFile(
      tempFile,
      JSON.stringify(data, null, 2),
      {
        encoding: "utf8",
        flag: "wx",
      }
    );

    await rename(tempFile, dataFile);
  } catch (error) {
    await rm(tempFile, { force: true }).catch(() => undefined);
    throw error;
  }
}

// Serialize local mutations so concurrent operations do not
// overwrite one another after loading the same old JSON data.
let storeQueue: Promise<void> = Promise.resolve();

async function mutateStore<T>(
  operation: (data: StoreData) => Promise<T> | T
): Promise<T> {
  const previous = storeQueue;

  let release!: () => void;

  storeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    const data = await load();
    const result = await operation(data);

    await save(data);

    return result;
  } finally {
    release();
  }
}

// ==================================================
// COMMON HELPERS
// ==================================================

function getEmailForUser(userId: string): string {
  const normalized = userId.trim().toLowerCase();

  if (
    normalized.includes("@") &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return normalized;
  }

  const safeId =
    normalized.replace(/[^a-z0-9._-]/g, "-") ||
    "demo-user";

  return `${safeId}@sitecraft.local`;
}

function toISOString(value: unknown): string {
  const date = value instanceof Date
    ? value
    : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date found in stored record.");
  }

  return date.toISOString();
}

function mapWebsite(record: StoreRecord): StoreRecord {
  const generatedCode = record.generatedCode;

  return {
    id: record.id,
    projectId: record.projectId,
    title: record.title,
    description: record.description ?? "",
    theme: record.theme,
    colorPalette: record.colorPalette,
    fontFamily: record.fontFamily,
    structure: record.structure,
    generatedCode,
    version: record.version,
    createdAt: toISOString(record.createdAt),
    updatedAt: toISOString(record.updatedAt),
    qa: generatedCode?.qa,
  };
}

function mapProject(project: StoreRecord): StoreRecord {
  return {
    id: project.id,
    userId: project.userId,
    name: project.name,
    description: project.description ?? "",
    initialPrompt: project.initialPrompt,
    status: projectStatusFromDb(project.status),
    framework: project.framework,
    createdAt: toISOString(project.createdAt),
    updatedAt: toISOString(project.updatedAt),

    websites: (project.Website ?? []).map(mapWebsite),

    generations: (project.Generation ?? []).map(
      (generation: StoreRecord) => ({
        id: generation.id,
        agent: generation.agent,
        userPrompt: generation.userPrompt,
        status: generationStatusFromDb(generation.status),
        input: generation.input,
        output: generation.output,
        error: generation.error || undefined,
        createdAt: toISOString(generation.createdAt),
      })
    ),

    messages: (project.ChatMessage ?? []).map(
      (message: StoreRecord) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: toISOString(message.createdAt),
      })
    ),

    deployments: (project.Deployment ?? []).map(
      (deployment: StoreRecord) => ({
        id: deployment.id,
        projectId: deployment.projectId,
        provider: deployment.provider,
        deploymentUrl:
          deployment.deploymentUrl || undefined,
        deploymentId:
          deployment.deploymentId || undefined,
        status: deployment.status,
        createdAt: toISOString(deployment.createdAt),
        updatedAt: toISOString(deployment.updatedAt),
      })
    ),
  };
}

async function ensureUser(userId: string): Promise<string> {
  if (!isDbOnline() || !prisma) {
    return userId;
  }

  const now = new Date();
  const email = getEmailForUser(userId);

  try {
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
    throw error;
  }
}

// ==================================================
// PROJECT QUERIES
// ==================================================

const projectIncludes = {
  Website: {
    orderBy: { version: "desc" as const },
  },
  Generation: {
    orderBy: { createdAt: "desc" as const },
  },
  ChatMessage: {
    orderBy: { createdAt: "asc" as const },
  },
  Deployment: {
    orderBy: { createdAt: "desc" as const },
  },
};

export async function listProjects(
  userId = "demo-user",
  role?: string
): Promise<StoreRecord[]> {
  if (isDbOnline() && prisma) {
    try {
      const projects = await prisma.project.findMany({
        where: role === "admin" ? {} : { userId },
        orderBy: { updatedAt: "desc" },
        include: projectIncludes,
      });

      return projects.map((project) =>
        mapProject(project as unknown as StoreRecord)
      );
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
      String(b.updatedAt).localeCompare(String(a.updatedAt))
    );
}

export async function getProject(
  id: string,
  userId?: string,
  userRole?: string
): Promise<StoreRecord | undefined> {
  if (isDbOnline() && prisma) {
    try {
      const where =
        userRole === "admin"
          ? { id }
          : userId
            ? { id, userId }
            : { id };

      const project = await prisma.project.findFirst({
        where,
        include: projectIncludes,
      });

      return project
        ? mapProject(project as unknown as StoreRecord)
        : undefined;
    } catch (error) {
      markDbFailed(error);
    }
  }

  const data = await load();

  return data.projects.find(
    (project) =>
      project.id === id &&
      (
        (!userId && !userRole) ||
        userRole === "admin" ||
        project.userId === userId
      )
  );
}

// ==================================================
// CREATE PROJECT
// ==================================================

export async function createProject(
  input: ProjectInput
): Promise<StoreRecord> {
  const userId = input.userId || "demo-user";
  const now = new Date();

  if (isDbOnline() && prisma) {
    try {
      const dbUserId = await ensureUser(userId);

      const project = await prisma.project.create({
        data: {
          id: randomUUID(),
          userId: dbUserId,
          name: input.name,
          description: input.description ?? "",
          initialPrompt: input.initialPrompt,
          status: "DRAFT",
          framework: "react-tailwind",
          createdAt: now,
          updatedAt: now,
        },
      });

      return {
        id: project.id,
        userId: project.userId,
        name: project.name,
        description: project.description ?? "",
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

  const project: StoreRecord = {
    id: randomUUID(),
    userId,
    name: input.name,
    description: input.description ?? "",
    initialPrompt: input.initialPrompt,
    status: "draft",
    framework: "react-tailwind",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    websites: [],
    generations: [],
    messages: [],
    deployments: [],
  };

  await mutateStore((data) => {
    data.projects.push(project);
  });

  return project;
}

// ==================================================
// DELETE PROJECT
// ==================================================

export async function deleteProject(
  id: string
): Promise<boolean> {
  if (isDbOnline() && prisma) {
    try {
      const deleted = await prisma.project.deleteMany({
        where: { id },
      });

      return deleted.count > 0;
    } catch (error) {
      markDbFailed(error);
    }
  }

  return mutateStore((data) => {
    const previousCount = data.projects.length;

    data.projects = data.projects.filter(
      (project) => project.id !== id
    );

    const deleted =
      data.projects.length < previousCount;

    if (deleted) {
      data.deployments = data.deployments.filter(
        (deployment) => deployment.projectId !== id
      );
    }

    return deleted;
  });
}

// ==================================================
// UPDATE PROJECT
// ==================================================

export async function updateProject(
  id: string,
  patch: ProjectPatch
): Promise<StoreRecord | undefined> {
  if (isDbOnline() && prisma) {
    try {
      const project = await prisma.project.update({
        where: { id },
        data: {
          ...(patch.status !== undefined
            ? { status: projectStatusToDb(patch.status) }
            : {}),
          ...(patch.name !== undefined
            ? { name: patch.name }
            : {}),
          ...(patch.description !== undefined
            ? { description: patch.description }
            : {}),
          updatedAt: new Date(),
        },
      });

      return await getProject(project.id);
    } catch (error) {
      markDbFailed(error);
    }
  }

  return mutateStore((data) => {
    const project = data.projects.find(
      (item) => item.id === id
    );

    if (!project) {
      return undefined;
    }

    Object.assign(project, patch, {
      updatedAt: new Date().toISOString(),
    });

    return project;
  });
}

// ==================================================
// ADD GENERATION
// ==================================================

export async function addGeneration(
  id: string,
  generation: GenerationInput
): Promise<StoreRecord | undefined> {
  if (isDbOnline() && prisma) {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        return undefined;
      }

      const now = new Date();

      const record = await prisma.generation.create({
        data: {
          id: randomUUID(),
          projectId: id,
          agent: generation.agent,
          userPrompt: generation.userPrompt,
          input: (generation.input ?? {}) as any,
          output: (generation.output ?? {}) as any,
          status: generationStatusToDb(generation.status),
          error: generation.error ?? null,
          tokenUsage: null,
          createdAt: now,
        },
      });

      await prisma.project.update({
        where: { id },
        data: { updatedAt: now },
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
    } catch (error) {
      markDbFailed(error);
    }
  }

  return mutateStore((data) => {
    const project = data.projects.find(
      (item) => item.id === id
    );

    if (!project) {
      return undefined;
    }

    project.generations ??= [];

    const now = new Date().toISOString();

    const record = {
      ...generation,
      id: randomUUID(),
      createdAt: now,
    };

    project.generations.push(record);
    project.updatedAt = now;

    return record;
  });
}

// ==================================================
// ADD CHAT MESSAGE
// ==================================================

export async function addMessage(
  id: string,
  role: string,
  content: string
): Promise<StoreRecord | undefined> {
  if (isDbOnline() && prisma) {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        return undefined;
      }

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
    } catch (error) {
      markDbFailed(error);
    }
  }

  return mutateStore((data) => {
    const project = data.projects.find(
      (item) => item.id === id
    );

    if (!project) {
      return undefined;
    }

    project.messages ??= [];

    const now = new Date().toISOString();

    const message = {
      id: randomUUID(),
      role,
      content,
      createdAt: now,
    };

    project.messages.push(message);
    project.updatedAt = now;

    return message;
  });
}

// ==================================================
// SAVE WEBSITE VERSION
// ==================================================

export async function saveWebsite(
  id: string,
  website: WebsiteInput
): Promise<StoreRecord | undefined> {
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

      if (!project) {
        return undefined;
      }

      const now = new Date();
      const latestWebsite = project.Website[0];

      const record = await prisma.website.create({
        data: {
          id: randomUUID(),
          projectId: id,
          title: website.title,
          description: website.description ?? "",
          theme: website.theme ?? null,
          colorPalette: (website.colorPalette ?? null) as any,
          fontFamily: website.fontFamily ?? null,
          structure: (website.structure ?? null) as any,
          generatedCode: (website.generatedCode ?? null) as any,
          version:
            website.version ??
            (latestWebsite?.version ?? 0) + 1,
          createdAt: now,
          updatedAt: now,
        },
      });

      await prisma.project.update({
        where: { id },
        data: {
          status: "READY",
          updatedAt: now,
        },
      });

      return mapWebsite(
        record as unknown as StoreRecord
      );
    } catch (error) {
      markDbFailed(error);
    }
  }

  return mutateStore((data) => {
    const project = data.projects.find(
      (item) => item.id === id
    );

    if (!project) {
      return undefined;
    }

    project.websites ??= [];

    const latestWebsite = [...project.websites].sort(
      (a, b) => (b.version ?? 0) - (a.version ?? 0)
    )[0];

    const now = new Date().toISOString();

    // Preserve previous versions instead of replacing them.
    const record = {
      ...website,
      id: randomUUID(),
      projectId: id,
      version:
        website.version ??
        (latestWebsite?.version ?? 0) + 1,
      createdAt: now,
      updatedAt: now,
    };

    project.websites.push(record);

    project.websites.sort(
      (a, b) => (b.version ?? 0) - (a.version ?? 0)
    );

    project.status = "ready";
    project.updatedAt = now;

    return record;
  });
}

// ==================================================
// RECORD DEPLOYMENT
// ==================================================

export async function recordDeployment(
  projectId: string,
  deployment: DeploymentInput
): Promise<StoreRecord> {
  const now = new Date();

  if (isDbOnline() && prisma) {
    try {
      const record = await prisma.deployment.create({
        data: {
          id: randomUUID(),
          projectId,
          provider: deployment.provider,
          deploymentUrl: deployment.deploymentUrl ?? null,
          deploymentId: deployment.deploymentId ?? null,
          status: deployment.status,
          createdAt: now,
          updatedAt: now,
        },
      });

      return {
        id: record.id,
        projectId: record.projectId,
        provider: record.provider,
        deploymentUrl:
          record.deploymentUrl || undefined,
        deploymentId:
          record.deploymentId || undefined,
        status: record.status,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };
    } catch (error) {
      markDbFailed(error);
    }
  }

  return mutateStore((data) => {
    const project = data.projects.find(
      (item) => item.id === projectId
    );

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

    data.deployments.push(record);

    if (project) {
      project.deployments ??= [];
      project.deployments.unshift(record);
      project.updatedAt = now.toISOString();
    }

    return record;
  });
}
