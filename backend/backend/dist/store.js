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

/* =========================================================
   TYPES
========================================================= */

type StoreRecord = Record<string, unknown>;

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

/* =========================================================
   CONFIGURATION
========================================================= */

const dataDir = path.resolve(
  process.env.SITECRAFT_DATA_DIR ??
    path.join(process.cwd(), ".data"),
);

const dataFile = path.join(dataDir, "sitecraft.json");

const prisma: PrismaClient | null = process.env.DATABASE_URL
  ? new PrismaClient()
  : null;

let dbAvailable = true;
let lastDbCheck = 0;

const DB_RETRY_INTERVAL = 30_000;

/* =========================================================
   DATABASE HELPERS
========================================================= */

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
    error instanceof Error ? error.message : String(error),
  );
}

function projectStatusToDb(status: string): string {
  return status.toUpperCase();
}

function projectStatusFromDb(status: string): string {
  return status.toLowerCase();
}

function generationStatusToDb(status: string): string {
  switch (status.toLowerCase()) {
    case "started":
    case "running":
      return "RUNNING";

    case "completed":
    case "success":
      return "SUCCESS";

    default:
      return "FAILED";
  }
}

function generationStatusFromDb(status: string): string {
  switch (status.toUpperCase()) {
    case "RUNNING":
      return "started";

    case "SUCCESS":
      return "completed";

    default:
      return "failed";
  }
}

/* =========================================================
   LOCAL JSON STORAGE
========================================================= */

function emptyStore(): StoreData {
  return {
    projects: [],
    deployments: [],
    apiUsage: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
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
      `The SiteCraft data file contains invalid JSON: ${dataFile}`,
    );
  }

  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.projects)
  ) {
    throw new Error(
      "Invalid SiteCraft store structure. Expected a projects array.",
    );
  }

  return {
    projects: parsed.projects as StoreRecord[],
    deployments: Array.isArray(parsed.deployments)
      ? parsed.deployments as StoreRecord[]
      : [],
    apiUsage: Array.isArray(parsed.apiUsage)
      ? parsed.apiUsage as StoreRecord[]
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
      },
    );

    await rename(tempFile, dataFile);
  } catch (error) {
    await rm(tempFile, { force: true }).catch(() => undefined);
    throw error;
  }
}

/* =========================================================
   SERIALIZED LOCAL MUTATIONS
========================================================= */

let storeQueue: Promise<void> = Promise.resolve();

async function mutateStore<T>(
  operation: (data: StoreData) => Promise<T> | T,
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

/* =========================================================
   COMMON HELPERS
========================================================= */

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
  const date =
    value instanceof Date
      ? value
      : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date found in stored record.");
  }

  return date.toISOString();
}