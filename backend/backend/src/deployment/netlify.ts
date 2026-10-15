import type { DeploymentResult } from "./vercel.js";

/* =========================================================
   Types
========================================================= */

interface DeploymentFile {
  path: string;
  content: string;
}

const NETLIFY_PROVIDER = "netlify";
const NETLIFY_API_URL = "https://api.netlify.com/api/v1";

/* =========================================================
   Helpers
========================================================= */

function getNetlifyToken(token?: string): string | undefined {
  const value = token?.trim() || process.env.NETLIFY_AUTH_TOKEN?.trim();

  return value || undefined;
}

function sanitizeProjectName(projectName: string): string {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
}

function validateFiles(
  files: DeploymentFile[],
): string | null {
  if (!Array.isArray(files) || files.length === 0) {
    return "No deployment files were provided.";
  }

  for (const file of files) {
    if (!file || typeof file !== "object") {
      return "Invalid deployment file.";
    }

    if (
      typeof file.path !== "string" ||
      !file.path.trim()
    ) {
      return "Each deployment file must have a valid path.";
    }

    if (typeof file.content !== "string") {
      return `Invalid content for file: ${file.path}`;
    }

    if (file.path.includes("..")) {
      return `Invalid deployment path: ${file.path}`;
    }
  }

  return null;
}

function errorResult(
  message: string,
): DeploymentResult {
  return {
    success: false,
    provider: NETLIFY_PROVIDER,
    status: "ERROR",
    error: message,
  };
}

/* =========================================================
   Netlify Deployment
========================================================= */

export async function deployToNetlify(
  projectName: string,
  files: DeploymentFile[],
  token?: string,
): Promise<DeploymentResult> {
  const netlifyToken = getNetlifyToken(token);

  /* -------------------------------------------------------
     Token validation
  ------------------------------------------------------- */

  if (!netlifyToken) {
    return errorResult(
      "Netlify deployment is not configured. Add NETLIFY_AUTH_TOKEN to .env.",
    );
  }

  /* -------------------------------------------------------
     Project validation
  ------------------------------------------------------- */

  if (!projectName || !projectName.trim()) {
    return errorResult(
      "A project name is required for Netlify deployment.",
    );
  }

  /* -------------------------------------------------------
     File validation
  ------------------------------------------------------- */

  const fileError = validateFiles(files);

  if (fileError) {
    return errorResult(fileError);
  }

  /* -------------------------------------------------------
     Site name
  ------------------------------------------------------- */

  const siteName = sanitizeProjectName(projectName);

  if (!siteName) {
    return errorResult(
      "The project name could not be converted into a valid Netlify site name.",
    );
  }

  /* -------------------------------------------------------
     Deployment adapter
  ------------------------------------------------------- */

  try {
    /*
     * Netlify deployment requires creating/finding a site and
     * uploading the generated site as a deploy.
     *
     * The current SiteCraft adapter does not yet have the
     * complete Netlify deployment flow implemented.
     *
     * Keeping this explicit is safer than pretending that a
     * deployment succeeded.
     */

    void NETLIFY_API_URL;
    void siteName;
    void files;

    return errorResult(
      "Netlify deployment adapter is configured, but the upload flow is not implemented yet.",
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Netlify deployment error.";

    return errorResult(
      `Netlify deployment failed: ${message}`,
    );
  }
}
