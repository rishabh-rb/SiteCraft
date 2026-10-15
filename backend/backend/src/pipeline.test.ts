
import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

/* =========================================================
   Types and Test Data
========================================================= */

type JsonObject = Record<string, unknown>;

type PipelineResponse = {
  plan: typeof plan;
  content: typeof content;
  design: typeof design;
  code: typeof code;
  qa: typeof qa;
};

const NVIDIA_BASE_URL =
  "https://integrate.api.nvidia.com/v1";

const NVIDIA_API_KEY = "nvidia-key";

const NVIDIA_MODEL =
  "qwen/qwen3-coder-480b-a35b-instruct";

const plan = {
  siteName: "Northstar Studio",
  description: "A creative studio website",
  pages: [
    {
      name: "Home",
      path: "/",
      purpose: "Landing page",
    },
  ],
  theme: "editorial",
  colorPalette: {
    primary: "#111827",
    secondary: "#F9FAFB",
    accent: "#6366F1",
  },
  font: "Inter",
  features: ["Responsive design", "Contact form"],
};

const content = {
  hero: {
    title: "Design Beyond Limits",
    subtitle:
      "Creative digital experiences for modern brands.",
    primaryCta: "Get Started",
    secondaryCta: "Explore Work",
  },
  sections: [
    {
      title: "Our Services",
      description: "We build digital experiences.",
    },
  ],
  testimonials: [
    {
      name: "Alex Morgan",
      text: "Excellent work and communication.",
    },
  ],
  faqs: [
    {
      question: "What do you do?",
      answer: "We create digital experiences.",
    },
  ],
  seo: {
    title: "Northstar Studio",
    description: "Creative digital studio.",
  },
};

const design = {
  layout: "modern-editorial",
  componentHierarchy: [
    "Header",
    "Hero",
    "Services",
    "Testimonials",
    "FAQ",
    "Footer",
  ],
  tokens: {
    colors: {
      primary: "#111827",
      accent: "#6366F1",
    },
    fontFamily: "Inter",
    borderRadius: "12px",
  },
  responsiveRules: [
    "Mobile-first layout",
    "Responsive navigation",
    "Flexible content grids",
  ],
};

const code = {
  html: "<main><h1>Northstar Studio</h1></main>",
  files: [
    {
      path: "src/index.tsx",
      content:
        "export default function App() { return <main><h1>Northstar Studio</h1></main>; }",
    },
    {
      path: "README.md",
      content: "# Northstar Studio",
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "northstar-studio",
          version: "1.0.0",
          scripts: {
            dev: "vite",
            build: "vite build",
          },
        },
        null,
        2,
      ),
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

const responses: PipelineResponse[] = [
  { plan, content, design, code, qa },
].flatMap((response) => [
  { plan: response.plan } as PipelineResponse,
  { content: response.content } as PipelineResponse,
  { design: response.design } as PipelineResponse,
  { code: response.code } as PipelineResponse,
  { qa: response.qa } as PipelineResponse,
]);

/* =========================================================
   Helpers
========================================================= */

function createMockFetch(
  mockResponses: unknown[],
): typeof fetch {
  let responseIndex = 0;

  return (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    assert.ok(
      responseIndex < mockResponses.length,
      "Unexpected extra NVIDIA provider request",
    );

    const requestUrl = new URL(String(input));
    const requestHeaders = new Headers(init?.headers);

    const currentIndex = responseIndex;
    const responseBody = mockResponses[responseIndex];

    responseIndex++;

    assert.equal(
      requestUrl.origin,
      new URL(NVIDIA_BASE_URL).origin,
      `Request ${currentIndex + 1} should use the configured NVIDIA base URL`,
    );

    assert.equal(
      requestUrl.pathname,
      `${new URL(NVIDIA_BASE_URL).pathname}/chat/completions`,
      `Request ${currentIndex + 1} should target chat completions`,
    );

    assert.equal(
      init?.method,
      "POST",
      `Request ${currentIndex + 1} should use POST`,
    );

    assert.equal(
      requestHeaders.get("Authorization"),
      `Bearer ${NVIDIA_API_KEY}`,
      `Request ${currentIndex + 1} should contain the NVIDIA API key`,
    );

    assert.match(
      requestHeaders.get("Content-Type") ?? "",
      /application\/json/i,
      `Request ${currentIndex + 1} should use JSON content type`,
    );

    assert.match(
      requestHeaders.get("Accept") ?? "",
      /application\/json/i,
      `Request ${currentIndex + 1} should accept JSON responses`,
    );

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify(responseBody),
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
  }) as typeof fetch;
}

function restoreEnvironment(
  originalEnv: NodeJS.ProcessEnv,
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

function assertJsonEqual(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  assert.deepStrictEqual(actual, expected, message);
}

/* =========================================================
   End-to-End Pipeline Test
========================================================= */

test(
  "runs the AI-backed generation pipeline end to end",
  async () => {
    const tempDir = await mkdtemp(
      path.join(os.tmpdir(), "sitecraft-pipeline-"),
    );

    const originalEnv = { ...process.env };
    const originalFetch = globalThis.fetch;

    try {
      /* Configure an isolated environment */

      process.env.SITECRAFT_DATA_DIR = tempDir;

      process.env.NVIDIA_API_KEY = NVIDIA_API_KEY;
      process.env.NVIDIA_BASE_URL = NVIDIA_BASE_URL;
      process.env.NVIDIA_MODEL = NVIDIA_MODEL;

      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      /* Install one persistent mock */

      let providerCalls = 0;

      const mockFetch = createMockFetch([
        plan,
        content,
        design,
        code,
        qa,
      ]);

      globalThis.fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        providerCalls++;

        return mockFetch(input, init);
      }) as typeof fetch;

      /*
       * Import after environment configuration.
       * This helps when modules read configuration at
       * initialization time, provided they are not cached.
       */

      const store = await import("./store.js");
      const orchestrator = await import("./orchestrator.js");

      /* Create a project */

      const project = await store.createProject({
        name: "Northstar Studio",
        description: "A creative studio website",
        initialPrompt:
          "Build a modern and responsive website for a creative studio.",
      });

      assert.ok(project, "Project should be created");
      assert.ok(project.id, "Project should have an ID");

      /* Execute the generation pipeline */

      const result = await orchestrator.generateProject(
        project.id,
      );

      assert.ok(result, "Pipeline should return a result");

      /* Verify provider calls */

      assert.equal(
        providerCalls,
        5,
        "Pipeline should make exactly five provider requests",
      );

      /* Verify generated plan */

      assertJsonEqual(
        result.plan,
        plan,
        "Generated plan should match the provider response",
      );

      /* Verify generated content */

      assertJsonEqual(
        result.content,
        content,
        "Generated content should match the provider response",
      );

      /* Verify generated design */

      assertJsonEqual(
        result.design,
        design,
        "Generated design should match the provider response",
      );

      /* Verify generated code */

      assertJsonEqual(
        result.code,
        code,
        "Generated code should match the provider response",
      );

      /* Verify quality assurance */

      assertJsonEqual(
        result.qa,
        qa,
        "QA result should match the provider response",
      );

      assert.equal(result.qa.passed, true);
      assert.equal(result.qa.score, 98);
      assert.deepStrictEqual(result.qa.issues, []);

      /* Verify generated files */

      assert.ok(
        Array.isArray(result.code.files),
        "Generated files should be an array",
      );

      assert.equal(
        result.code.files.length,
        code.files.length,
      );

      assert.deepStrictEqual(
        result.code.files.map(
          (file: { path: string }) => file.path,
        ),
        code.files.map((file) => file.path),
      );

      assert.ok(
        Array.isArray(result.code.assets),
        "Generated assets should be an array",
      );

      assert.equal(
        result.code.assets.length,
        code.assets.length,
      );

      /* Verify persisted project */

      const storedProject = await store.getProject(
        project.id,
      );

      assert.ok(
        storedProject,
        "Generated project should be stored",
      );

      assert.equal(storedProject.id, project.id);

      assert.equal(
        storedProject.status,
        "completed",
        "Project status should be completed",
      );

      assertJsonEqual(
        storedProject.plan,
        result.plan,
        "Stored plan should match the generated plan",
      );

      assertJsonEqual(
        storedProject.content,
        result.content,
        "Stored content should match generated content",
      );

      assertJsonEqual(
        storedProject.design,
        result.design,
        "Stored design should match generated design",
      );

      assertJsonEqual(
        storedProject.code,
        result.code,
        "Stored code should match generated code",
      );

      assertJsonEqual(
        storedProject.qa,
        result.qa,
        "Stored QA should match generated QA",
      );
    } finally {
      /* Restore global state even if an assertion fails */

      globalThis.fetch = originalFetch;

      restoreEnvironment(originalEnv);

      await rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  },
);
