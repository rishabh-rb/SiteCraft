
import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

/* =========================================================
   Test Data
========================================================= */

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
    subtitle: "Creative digital experiences for modern brands.",
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
      content: "export default function App() { return <main><h1>Northstar Studio</h1></main>; }",
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
        2
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

/* =========================================================
   Mock Provider Responses
========================================================= */

const responses = [plan, content, design, code, qa];

/* =========================================================
   Helpers
========================================================= */

function createMockFetch(
  mockResponses: unknown[]
): typeof fetch {
  let responseIndex = 0;

  return (async (_input: RequestInfo | URL, _init?: RequestInit) => {
    assert.ok(
      responseIndex < mockResponses.length,
      "Unexpected extra provider request"
    );

    const responseBody = mockResponses[responseIndex];
    responseIndex++;

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
      }
    );
  }) as typeof fetch;
}

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

/* =========================================================
   End-to-End Pipeline Test
========================================================= */

test("runs the AI-backed generation pipeline end to end", async () => {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "sitecraft-pipeline-")
  );

  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  try {
    /* Configure isolated test environment */

    process.env.SITECRAFT_DATA_DIR = tempDir;

    process.env.NVIDIA_API_KEY = "nvidia-key";
    process.env.NVIDIA_BASE_URL =
      "https://integrate.api.nvidia.com/v1";
    process.env.NVIDIA_MODEL =
      "qwen/qwen3-coder-480b-a35b-instruct";

    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    /* Configure mock provider */

    let providerCalls = 0;

    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      providerCalls++;

      const response = await createMockFetch(responses)(
        input,
        init
      );

      return response;
    }) as typeof fetch;

    /*
     * Import after environment configuration.
     * This helps modules that read environment variables
     * during initialization.
     */

    const storeModule = await import("./store.js");
    const orchestratorModule = await import("./orchestrator.js");

    const store = storeModule;
    const orchestrator = orchestratorModule;

    /* Create a project */

    const project = await store.createProject({
      name: "Northstar Studio",
      description: "A creative studio website",
      initialPrompt:
        "Build a modern and responsive website for a creative studio.",
    });

    assert.ok(project, "Project should be created");
    assert.ok(project.id, "Project should have an ID");

    /* Run the generation pipeline */

    const result = await orchestrator.generateProject(project.id);

    assert.ok(result, "Pipeline should return a result");

    /* Verify provider calls */

    assert.equal(
      providerCalls,
      responses.length,
      "Pipeline should make one request for each generation stage"
    );

    /* Verify generated result */

    assert.equal(result.plan.siteName, plan.siteName);
    assert.equal(result.content.hero.title, content.hero.title);
    assert.equal(result.design.layout, design.layout);
    assert.equal(result.code.html, code.html);
    assert.equal(result.qa.passed, true);
    assert.equal(result.qa.score, 98);
    assert.deepEqual(result.qa.issues, []);

    /* Verify generated files */

    assert.ok(Array.isArray(result.code.files));
    assert.equal(result.code.files.length, code.files.length);

    assert.deepEqual(
      result.code.files.map((file: { path: string }) => file.path),
      code.files.map((file) => file.path)
    );

    assert.ok(Array.isArray(result.code.assets));
    assert.equal(
      result.code.assets.length,
      code.assets.length
    );

    /* Verify saved project */

    const storedProject = await store.getProject(project.id);

    assert.ok(storedProject, "Generated project should be stored");

    assert.equal(storedProject.id, project.id);

    assert.equal(
      storedProject.status,
      "completed",
      "Project status should be completed"
    );

    assert.deepEqual(storedProject.plan, result.plan);
    assert.deepEqual(storedProject.content, result.content);
    assert.deepEqual(storedProject.design, result.design);
    assert.deepEqual(storedProject.code, result.code);
    assert.deepEqual(storedProject.qa, result.qa);
  } finally {
    /* Restore global fetch */

    globalThis.fetch = originalFetch;

    /* Restore environment variables */

    restoreEnvironment(originalEnv);

    /* Remove temporary test data */

    await rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
});
