
/* =========================================================
   Deployment Types
========================================================= */

export interface DeploymentResult {
  success: boolean;

  deploymentUrl?: string;
  deploymentId?: string;

  provider: string;

  status:
    | "READY"
    | "BUILDING"
    | "ERROR"
    | "PENDING";

  error?: string;
}

/* =========================================================
   Constants
========================================================= */

const VERCEL_API_URL =
  "https://api.vercel.com/v13/deployments";

const VERCEL_PROVIDER = "vercel";

const DEPLOYMENT_TIMEOUT_MS = 30_000;

const MAX_PROJECT_NAME_LENGTH = 50;

const MAX_FILE_COUNT = 500;

/* =========================================================
   Types
========================================================= */

interface DeploymentFile {
  path: string;
  content: string;
}

interface VercelError {
  message?: string;
  code?: string;
}

interface VercelDeploymentResponse {
  id?: string;
  url?: string;
  readyState?: string;
  error?: VercelError;
}

/* =========================================================
   Helpers
========================================================= */

function getVercelToken(token?: string): string | undefined {
  const providedToken = token?.trim();

  if (providedToken) {
    return providedToken;
  }

  const environmentToken =
    process.env.VERCEL_TOKEN?.trim();

  return environmentToken || undefined;
}

function sanitizeProjectName(
  projectName: string,
): string {
  const cleanName = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_PROJECT_NAME_LENGTH);

  return cleanName || "sitecraft-project";
}

function validateDeploymentFiles(
  files: DeploymentFile[],
): string | null {
  if (!Array.isArray(files)) {
    return "Deployment files must be provided as an array.";
  }

  if (files.length === 0) {
    return "No deployment files were provided.";
  }

  if (files.length > MAX_FILE_COUNT) {
    return `Too many deployment files. Maximum allowed is ${MAX_FILE_COUNT}.`;
  }

  for (const file of files) {
    if (!file || typeof file !== "object") {
      return "Invalid deployment file.";
    }

    if (
      typeof file.path !== "string" ||
      !file.path.trim()
    ) {
      return "Every deployment file must have a valid path.";
    }

    if (typeof file.content !== "string") {
      return `Invalid content for file: ${file.path}`;
    }

    const normalizedPath = file.path
      .replace(/\\/g, "/")
      .trim();

    if (
      normalizedPath.startsWith("/") ||
      normalizedPath.includes("../") ||
      normalizedPath.includes("/..")
    ) {
      return `Invalid deployment path: ${file.path}`;
    }
  }

  return null;
}

function normalizeDeploymentUrl(
  url?: string,
): string | undefined {
  if (!url) {
    return undefined;
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return undefined;
  }

  if (
    trimmedUrl.startsWith("http://") ||
    trimmedUrl.startsWith("https://")
  ) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

function getDeploymentStatus(
  readyState?: string,
): DeploymentResult["status"] {
  switch (readyState?.toUpperCase()) {
    case "READY":
      return "READY";

    case "ERROR":
    case "CANCELED":
      return "ERROR";

    case "QUEUED":
      return "PENDING";

    case "BUILDING":
    case "INITIALIZING":
    case "ANALYZING":
    case "DEPLOYING":
    default:
      return "BUILDING";
  }
}

function createErrorResult(
  message: string,
): DeploymentResult {
  return {
    success: false,
    provider: VERCEL_PROVIDER,
    status: "ERROR",
    error: message,
  };
}

/* =========================================================
   Vercel Deployment
========================================================= */

export async function deployToVercel(
  projectName: string,
  files: DeploymentFile[],
  token?: string,
  teamId?: string,
): Promise<DeploymentResult> {
  /* -------------------------------------------------------
     Token
  ------------------------------------------------------- */

  const vercelToken = getVercelToken(token);

  if (!vercelToken) {
    return createErrorResult(
      "Vercel deployment is not configured. Add VERCEL_TOKEN to .env.",
    );
  }

  /* -------------------------------------------------------
     Project Name
  ------------------------------------------------------- */

  if (
    typeof projectName !== "string" ||
    !projectName.trim()
  ) {
    return createErrorResult(
      "A project name is required for Vercel deployment.",
    );
  }

  /* -------------------------------------------------------
     Files
  ------------------------------------------------------- */

  const fileError = validateDeploymentFiles(files);

  if (fileError) {
    return createErrorResult(fileError);
  }

  /* -------------------------------------------------------
     Project Name
  ------------------------------------------------------- */

  const cleanName =
    sanitizeProjectName(projectName);

  /* -------------------------------------------------------
     Team Query Parameter
  ------------------------------------------------------- */

  const cleanTeamId = teamId?.trim();

  const urlParams = cleanTeamId
    ? `?teamId=${encodeURIComponent(cleanTeamId)}`
    : "";

  /* -------------------------------------------------------
     Abort / Timeout
  ------------------------------------------------------- */

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, DEPLOYMENT_TIMEOUT_MS);

  try {
    /* -----------------------------------------------------
       Prepare Vercel Files
    ----------------------------------------------------- */

    const payloadFiles = files.map((file) => ({
      file: file.path
        .replace(/\\/g, "/")
        .replace(/^\/+/, ""),
      data: file.content,
    }));

    /* -----------------------------------------------------
       Vercel API Request
    ----------------------------------------------------- */

    const response = await fetch(
      `${VERCEL_API_URL}${urlParams}`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          name: cleanName,

          files: payloadFiles,

          projectSettings: {
            framework: null,
          },
        }),

        signal: controller.signal,
      },
    );

    /* -----------------------------------------------------
       Response Parsing
    ----------------------------------------------------- */

    const responseText =
      await response.text();

    let data: VercelDeploymentResponse = {};

    if (responseText.trim()) {
      try {
        data = JSON.parse(
          responseText,
        ) as VercelDeploymentResponse;
      } catch {
        return createErrorResult(
          `Vercel returned an invalid response with status ${response.status}.`,
        );
      }
    }

    /* -----------------------------------------------------
       API Error
    ----------------------------------------------------- */

    if (!response.ok || data.error) {
      const errorMessage =
        data.error?.message?.trim();

      const errorCode =
        data.error?.code?.trim();

      if (errorMessage) {
        return createErrorResult(
          errorCode
            ? `${errorMessage} (${errorCode})`
            : errorMessage,
        );
      }

      return createErrorResult(
        `Vercel deployment failed with status ${response.status}.`,
      );
    }

    /* -----------------------------------------------------
       Deployment ID
    ----------------------------------------------------- */

    if (!data.id) {
      return createErrorResult(
        "Vercel deployment succeeded but no deployment ID was returned.",
      );
    }

    /* -----------------------------------------------------
       Deployment Result
    ----------------------------------------------------- */

    const status =
      getDeploymentStatus(
        data.readyState,
      );

    const deploymentUrl =
      normalizeDeploymentUrl(data.url);

    return {
      success: true,
      provider: VERCEL_PROVIDER,
      status,
      deploymentId: data.id,
      deploymentUrl,
    };
  } catch (caught) {
    /* -----------------------------------------------------
       Timeout
    ----------------------------------------------------- */

    if (
      caught instanceof DOMException &&
      caught.name === "AbortError"
    ) {
      return createErrorResult(
        "Vercel deployment timed out. Please try again.",
      );
    }

    /* -----------------------------------------------------
       Network / Unknown Error
    ----------------------------------------------------- */

    if (caught instanceof Error) {
      return createErrorResult(
        `Vercel deployment failed: ${caught.message}`,
      );
    }

    return createErrorResult(
      "Vercel deployment failed due to an unknown error.",
    );
  } finally {
    clearTimeout(timeout);
  }
}