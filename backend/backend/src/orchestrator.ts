
import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

/* =========================================================
   Types
========================================================= */

type JsonObject = Record<string, unknown>;

type MockRequest = {
  url: string;
  method?: string;
  headers: Headers;
  body: string;
};

type PipelineResponse = {
  siteName: string;
  siteDescription: string;
  pages: Array<{
    name: string;
    slug: string;
    pageType: string;
    sections: string[];
  }>;
  theme: string;
  colorPalette: Record<string, string>;
  fontFamily: string;
  features: string[];
};

type ContentResponse = {
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  sections: Array<{ title: string; body: string }>;
  testimonials: Array<{
    quote: string;
    name: string;
    role: string;
  }>;
  faq: Array<{ question: string; answer: string }>;
  seo: { title: string; description: string };
};

/* =========================================================
   Test Data
========================================================= */

const EXPECTED_PROVIDER_CALLS = 5;
const EXPECTED_PROVIDER = "nvidia";
const EXPECTED_MODEL = "qwen/qwen3-coder-480b-a35b-instruct";
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

const plan: PipelineResponse = {
  siteName: "Northstar Studio",
  siteDescription: "A clear, high-trust studio website.",
  pages: [
    {
      name: "Home",
      slug: "/",
      pageType: "landing",
      sections: ["hero", "proof", "contact"],
    },
  ],
  theme: "editorial",
  colorPalette: {
    primary: "#0f766e",
    secondary: "#99f6e4",
    background: "#071313",
    foreground: "#ecfdf5",
  },
  fontFamily: "Inter, sans-serif",
  features: ["responsive", "accessible"],
};

const content: ContentResponse = {
  heroTitle: "Design systems that ship",
  heroSubtitle:
    "We help teams move from idea to launch without losing the thread.",
  primaryCta: "Start a project",
  secondaryCta: "See the process",
  sections: [
    {
      title: "Built for momentum",
      body:
        "A focused workflow keeps the output practical and shippable.",
    },
  ],
  testimonials: [
    {
      quote: "The first draft was already useful.",
      name: "Ava Chen",
      role: "Product Lead",
    },
  ],
  faq: [
    {
      question: "Do you support revisions?",
      answer:
        "Yes. The generated project can be revised in place.",
    },
  ],
  seo: {
    title: "Northstar Studio",
    description: "A clear, high-trust studio website.",
  },
};

const design = {
  layout:
    "Editorial hero with a compact proof grid and conversion footer.",
  componentHierarchy: [
    "SiteShell",
    "Hero",
    "ProofGrid",
    "ContactFooter",
  ],
  tokens: {
    radius: "24px",
    spacing: "clamp(1rem, 2vw, 2rem)",
    shadow: "0 24px 80px rgba(0,0,0,.25)",
  },
  responsiveRules: [
    "Collapse navigation under 760px",
    "Use one-column cards under 900px",
  ],
};

const code = {
  html: "<main><h1>Northstar Studio</h1></main>",
  files: [
    {
      path: "src/index.tsx",
      language: "tsx",
      content:
        "export default function App() { return <main />; }",
    },
    {
      path: "README.md",
      language: "md",
      content: "# Northstar Studio",
    },
    {
      path: "package.json",
      language: "json",
      content: '{"name":"northstar-studio"}',
    },
  ],
  assets: [],
};

const qa = {
  passed: true,
  score: 98,
  issues: [],
};

/* =========================================================
   Reusable Helpers
========================================================= */

/**
 * Converts a JSON value into a mock NVIDIA chat response.
 */
function createProviderResponse(value: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(value),
          },
        },
      ],
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Parses a recorded request body safely.
 */
function parseRequestBody(body: string): JsonObject {
  const parsed: unknown = JSON.parse(body);

  assert.ok(
    typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed),
    "Provider request body must be a JSON object"
  );

  return parsed as JsonObject;
}

/**
 * Restores environment variables to their original state.
 */
function restoreEnvironment(
  originalEnv: NodeJS.ProcessEnv
): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

/**
 * Checks the common properties of every provider request.
 */
function assertProviderRequests(
  requests: MockRequest[],
  expectedCount: number
): JsonObject[] {
  assert.equal(requests.length, expectedCount);

  return requests.map((request, index) => {
    assert.match(
      request.url,
      /^https:\/\/integrate\.api\.nvidia\.com\/v1\/chat\/completions(?:\?.*)?$/,
      `Request ${index + 1} should target NVIDIA chat completions`
    );

    assert.equal(
      request.method,
      "POST",
      `Request ${index + 1} should use POST`
    );

    assert.equal(
      request.headers.get("Authorization"),
      "Bearer nvidia-key",
      `Request ${index + 1} should contain the NVIDIA API key`
    );

    assert.match(
      request.headers.get("Content-Type") ?? "",
      /application\/json/i,
      `Request ${index + 1} should use JSON content`
    );

    const body = parseRequestBody(request.body);

    assert.equal(
      body.model,
      EXPECTED_MODEL,
      `Request ${index + 1} should use the configured model`
    );

    assert.ok(
      Array.isArray(body.messages),
      `Request ${index + 1} should contain chat messages`
    );

    return body;
  });
}

/* =========================================================
   End-to-End Generation Pipeline
========================================================= */

test(
  "runs the AI-backed generation pipeline end to end",
  async () => {
    const tempDir = await mkdtemp(
      path.join(os.tmpdir(), "sitecraft-pipeline-")
    );

    const originalEnv = { ...process.env };
    const originalFetch = globalThis.fetch;

    try {
      /* ---------------------------------------------------
         Configure an isolated test environment
      --------------------------------------------------- */

      process.env.SITECRAFT_DATA_DIR = tempDir;

      delete process.env.DATABASE_URL;
      delete process.env.GEMINI_API_KEY;
      delete process.env.BYNARA_API_KEY;
      delete process.env.OPENAI_API_KEY;

      process.env.NVIDIA_API_KEY = "nvidia-key";
      process.env.NVIDIA_BASE_URL = NVIDIA_BASE_URL;
      process.env.NVIDIA_MODEL = EXPECTED_MODEL;

      /* ---------------------------------------------------
         Prepare the five mocked provider responses
      --------------------------------------------------- */

      const responses: unknown[] = [
        plan,
        content,
        design,
        code,
        qa,
      ];

      let callIndex = 0;

      const requests: MockRequest[] = [];

      globalThis.fetch = (async (
        input: string | URL | Request,
        init?: RequestInit
      ): Promise<Response> => {
        const url = String(input);
        const headers = new Headers(
          init?.headers ??
            (input instanceof Request ? input.headers : undefined)
        );

        const rawBody =
          typeof init?.body === "string"
            ? init.body
            : input instanceof Request
              ? await input.clone().text()
              : "";

        requests.push({
          url,
          method: init?.method ??
            (input instanceof Request ? input.method : undefined),
          headers,
          body: rawBody,
        });

        assert.ok(
          callIndex < responses.length,
          `Unexpected provider call ${callIndex + 1}; expected only ${responses.length} calls`
        );

        const responseData = responses[callIndex];

        callIndex += 1;

        return createProviderResponse(responseData);
      }) as typeof fetch;

      /* ---------------------------------------------------
         Import application modules after configuration
      --------------------------------------------------- */

      const { createProject, getProject } =
        await import("./store.js");

      const { generateProject } =
        await import("./orchestrator.js");

      /* ---------------------------------------------------
         1. Create a project
      --------------------------------------------------- */

      const project = await createProject({
        userId: "demo-user",
        name: "Northstar",
        description: "Demo",
        initialPrompt: "Build a studio site",
      });

      assert.ok(project.id, "Project should have an ID");
      assert.equal(project.name, "Northstar");
      assert.equal(project.userId, "demo-user");

      /* ---------------------------------------------------
         2. Execute the generation pipeline
      --------------------------------------------------- */

      const result = await generateProject(
        project.id,
        "Build a studio site"
      );

      const stored = await getProject(project.id);

      assert.ok(result, "Pipeline should return a result");
      assert.ok(stored, "Generated project should be stored");

      /* ---------------------------------------------------
         3. Validate provider requests
      --------------------------------------------------- */

      assert.equal(
        callIndex,
        EXPECTED_PROVIDER_CALLS,
        "Pipeline should make exactly five provider calls"
      );

      const parsedRequests = assertProviderRequests(
        requests,
        EXPECTED_PROVIDER_CALLS
      );

      assert.equal(parsedRequests.length, 5);
      assert.equal(
        result.provider,
        EXPECTED_PROVIDER,
        "NVIDIA should be the active provider"
      );

      /* ---------------------------------------------------
         4. Validate quality assurance
      --------------------------------------------------- */

      assert.equal(result.qa.passed, qa.passed);
      assert.equal(result.qa.score, qa.score);
      assert.deepEqual(result.qa.issues, qa.issues);

      /* ---------------------------------------------------
         5. Validate the generated plan
      --------------------------------------------------- */

      assert.equal(result.website.plan.siteName, plan.siteName);
      assert.equal(
        result.website.plan.siteDescription,
        plan.siteDescription
      );
      assert.equal(result.website.plan.theme, plan.theme);
      assert.equal(
        result.website.plan.fontFamily,
        plan.fontFamily
      );

      assert.deepEqual(
        result.website.plan.colorPalette,
        plan.colorPalette
      );

      assert.deepEqual(
        result.website.plan.features,
        plan.features
      );

      assert.deepEqual(
        result.website.plan.pages,
        plan.pages
      );

      /* ---------------------------------------------------
         6. Validate generated content
      --------------------------------------------------- */

      assert.equal(
        result.website.content.heroTitle,
        content.heroTitle
      );

      assert.equal(
        result.website.content.heroSubtitle,
        content.heroSubtitle
      );

      assert.equal(
        result.website.content.primaryCta,
        content.primaryCta
      );

      assert.equal(
        result.website.content.secondaryCta,
        content.secondaryCta
      );

      assert.deepEqual(
        result.website.content.sections,
        content.sections
      );

      assert.deepEqual(
        result.website.content.testimonials,
        content.testimonials
      );

      assert.deepEqual(
        result.website.content.faq,
        content.faq
      );

      assert.deepEqual(
        result.website.content.seo,
        content.seo
      );

      /* ---------------------------------------------------
         7. Validate generated design
      --------------------------------------------------- */

      assert.equal(
        result.website.design.layout,
        design.layout
      );

      assert.deepEqual(
        result.website.design.componentHierarchy,
        design.componentHierarchy
      );

      assert.deepEqual(
        result.website.design.tokens,
        design.tokens
      );

      assert.deepEqual(
        result.website.design.responsiveRules,
        design.responsiveRules
      );

      /* ---------------------------------------------------
         8. Validate generated HTML and files
      --------------------------------------------------- */

      assert.equal(
        result.website.html,
        code.html,
        "Generated HTML should match the code provider response"
      );

      assert.ok(
        result.website.html.includes("Northstar Studio")
      );

      assert.ok(
        result.website.html.includes("<main")
      );

      assert.deepEqual(
        result.website.files,
        code.files,
        "Generated files should match the code provider response"
      );

      assert.deepEqual(
        result.website.assets,
        code.assets
      );

      const filesByPath = new Map(
        result.website.files.map((file) => [
          file.path,
          file,
        ])
      );

      for (const expectedFile of code.files) {
        const actualFile = filesByPath.get(expectedFile.path);

        assert.ok(
          actualFile,
          `Missing generated file: ${expectedFile.path}`
        );

        assert.equal(
          actualFile.content,
          expectedFile.content,
          `Incorrect content in ${expectedFile.path}`
        );
      }

      /* ---------------------------------------------------
         9. Validate stored project status
      --------------------------------------------------- */

      assert.equal(
        stored.status,
        "ready",
        "Project should be ready after successful generation"
      );

      assert.equal(
        stored.websites.length,
        1,
        "Project should contain one generated website"
      );

      const storedWebsite = stored.websites[0];

      assert.ok(
        storedWebsite,
        "Stored website should exist"
      );

      assert.equal(storedWebsite.title, plan.siteName);
      assert.equal(
        storedWebsite.description,
        plan.siteDescription
      );
      assert.equal(storedWebsite.theme, plan.theme);
      assert.equal(storedWebsite.fontFamily, plan.fontFamily);

      /* ---------------------------------------------------
         10. Validate persisted generated code
      --------------------------------------------------- */

      const generatedCode = storedWebsite.generatedCode;

      assert.ok(
        generatedCode,
        "Stored website should contain generated code"
      );

      assert.deepEqual(generatedCode.plan, result.website.plan);
      assert.deepEqual(
        generatedCode.content,
        result.website.content
      );
      assert.deepEqual(
        generatedCode.design,
        result.website.design
      );
      assert.deepEqual(generatedCode.qa, result.website.qa);

      assert.equal(
        generatedCode.html,
        result.website.html,
        "Persisted HTML should match the returned HTML"
      );

      assert.deepEqual(
        generatedCode.files,
        result.website.files,
        "Persisted files should match the returned files"
      );

      assert.deepEqual(
        generatedCode.assets,
        result.website.assets
      );
    } finally {
      /* ---------------------------------------------------
         Always restore global state and remove test data
      --------------------------------------------------- */

      globalThis.fetch = originalFetch;

      restoreEnvironment(originalEnv);

      await rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  }
);
