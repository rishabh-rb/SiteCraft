
import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

// =====================================================
// Test Data
// =====================================================

const NVIDIA_BASE_URL =
  "https://integrate.api.nvidia.com/v1";

const NVIDIA_MODEL =
  "qwen/qwen3-coder-480b-a35b-instruct";

const NVIDIA_API_KEY = "nvidia-key";

const USER_ID = "demo-user";
const PROJECT_NAME = "Northstar";
const PROJECT_PROMPT = "Build a studio site";

// =====================================================
// Mock AI Responses
// =====================================================

const plan = {
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

const content = {
  heroTitle: "Design systems that ship",
  heroSubtitle:
    "We help teams move from idea to launch without losing the thread.",
  primaryCta: "Start a project",
  secondaryCta: "See the process",
  sections: [
    {
      title: "Built for momentum",
      body: "A focused workflow keeps the output practical and shippable.",
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
      answer: "Yes. The generated project can be revised in place.",
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
  ],
  assets: [
    {
      kind: "illustration",
      description: "Editorial abstract hero",
    },
  ],
};

const qa = {
  passed: true,
  score: 98,
  issues: [],
};

const AI_RESPONSES: unknown[] = [
  plan,
  content,
  design,
  code,
  qa,
];

// =====================================================
// Environment Helpers
// =====================================================

function restoreEnvironment(
  originalEnv: NodeJS.ProcessEnv,
): void {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }

  Object.assign(process.env, originalEnv);
}

function configureTestEnvironment(
  tempDir: string,
): void {
  process.env.SITECRAFT_DATA_DIR = tempDir;

  // Prevent unrelated providers from being selected.
  delete process.env.DATABASE_URL;
  delete process.env.GEMINI_API_KEY;
  delete process.env.BYNARA_API_KEY;
  delete process.env.OPENAI_API_KEY;

  process.env.NVIDIA_API_KEY = NVIDIA_API_KEY;
  process.env.NVIDIA_BASE_URL = NVIDIA_BASE_URL;
  process.env.NVIDIA_MODEL = NVIDIA_MODEL;
}

// =====================================================
// AI Response Helper
// =====================================================

function createAIResponse(body: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(body),
          },
        },
      ],
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

// =====================================================
// End-to-End Pipeline Test
// =====================================================

test(
  "runs the AI-backed generation pipeline end to end",
  async () => {
    const tempDir = await mkdtemp(
      path.join(os.tmpdir(), "sitecraft-pipeline-"),
    );

    const originalEnv = { ...process.env };
    const originalFetch = globalThis.fetch;

    let callIndex = 0;

    try {
      // -----------------------------------------------
      // 1. Configure isolated test environment
      // -----------------------------------------------

      configureTestEnvironment(tempDir);

      // -----------------------------------------------
      // 2. Mock NVIDIA AI requests
      // -----------------------------------------------

      globalThis.fetch = (async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ): Promise<Response> => {
        const requestUrl = new URL(String(input));

        assert.equal(
          requestUrl.origin,
          NVIDIA_BASE_URL,
          "AI requests must use the configured NVIDIA API",
        );

        assert.match(
          requestUrl.pathname,
          /\/chat\/completions\/?$/,
          "AI requests must target the chat completions endpoint",
        );

        assert.equal(
          init?.method,
          "POST",
          "AI requests must use POST",
        );

        const headers = new Headers(init?.headers);

        assert.equal(
          headers.get("Authorization"),
          `Bearer ${NVIDIA_API_KEY}`,
          "AI requests must use the NVIDIA API key",
        );

        assert.match(
          headers.get("Content-Type") ?? "",
          /application\/json/i,
          "AI requests must send JSON",
        );

        assert.ok(
          callIndex < AI_RESPONSES.length,
          `Unexpected AI request at index ${callIndex}`,
        );

        assert.equal(
          typeof init?.body,
          "string",
          "AI request must contain a JSON body",
        );

        const requestBody = JSON.parse(
          String(init?.body),
        ) as Record<string, unknown>;

        assert.ok(
          typeof requestBody.model === "string" &&
            requestBody.model.length > 0,
          "AI request must specify a model",
        );

        const responseBody = AI_RESPONSES[callIndex];

        callIndex++;

        return createAIResponse(responseBody);
      }) as typeof fetch;

      // -----------------------------------------------
      // 3. Import modules after environment setup
      // -----------------------------------------------

      const { createProject, getProject } =
        await import("./store.js");

      const { generateProject } =
        await import("./orchestrator.js");

      // -----------------------------------------------
      // 4. Create a project
      // -----------------------------------------------

      const project = await createProject({
        userId: USER_ID,
        name: PROJECT_NAME,
        description: "Demo",
        initialPrompt: PROJECT_PROMPT,
      });

      assert.ok(project.id);
      assert.equal(project.name, PROJECT_NAME);

      // -----------------------------------------------
      // 5. Run the generation pipeline
      // -----------------------------------------------

      const result = await generateProject(
        project.id,
        PROJECT_PROMPT,
      );

      // -----------------------------------------------
      // 6. Verify quality assurance
      // -----------------------------------------------

      assert.equal(result.qa.passed, true);
      assert.equal(result.qa.score, 98);
      assert.deepEqual(result.qa.issues, []);

      // -----------------------------------------------
      // 7. Verify generated plan
      // -----------------------------------------------

      assert.equal(
        result.website.plan.siteName,
        plan.siteName,
      );

      assert.equal(
        result.website.plan.pages.length,
        1,
      );

      assert.equal(
        result.website.plan.pages[0]?.name,
        "Home",
      );

      assert.equal(
        result.website.plan.theme,
        "editorial",
      );

      // -----------------------------------------------
      // 8. Verify generated content
      // -----------------------------------------------

      assert.equal(
        result.website.content.heroTitle,
        content.heroTitle,
      );

      assert.equal(
        result.website.content.primaryCta,
        content.primaryCta,
      );

      // -----------------------------------------------
      // 9. Verify generated design
      // -----------------------------------------------

      assert.ok(result.website.design);

      assert.deepEqual(
        result.website.design.componentHierarchy,
        design.componentHierarchy,
      );

      // -----------------------------------------------
      // 10. Verify generated HTML and files
      // -----------------------------------------------

      assert.ok(
        result.website.html.includes("Northstar Studio"),
        "Generated HTML must contain the website name",
      );

      assert.ok(
        Array.isArray(result.website.files),
        "Generated website must contain files",
      );

      assert.ok(
        result.website.files.length > 0,
        "Generated website must contain at least one file",
      );

      // -----------------------------------------------
      // 11. Verify provider selection
      // -----------------------------------------------

      assert.equal(result.provider, "nvidia");

      // -----------------------------------------------
      // 12. Verify persistence
      // -----------------------------------------------

      const stored = await getProject(project.id);

      assert.ok(stored, "Project must be persisted");

      assert.equal(
        stored.status,
        "ready",
        "Project status must be ready after generation",
      );

      assert.ok(
        stored.websites.length > 0,
        "Generated website must be persisted",
      );

      assert.ok(
        stored.websites[0]?.generatedCode.html.includes(
          "Northstar Studio",
        ),
        "Persisted website HTML must contain the generated site",
      );

      // -----------------------------------------------
      // 13. Verify AI request count
      // -----------------------------------------------

      assert.equal(
        callIndex,
        AI_RESPONSES.length,
        "Every expected AI response must be consumed exactly once",
      );
    } finally {
      // -----------------------------------------------
      // 14. Restore global state and remove test data
      // -----------------------------------------------

      globalThis.fetch = originalFetch;

      restoreEnvironment(originalEnv);

      await rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  },
);
