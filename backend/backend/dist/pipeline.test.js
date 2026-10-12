
import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

test("runs the AI-backed generation pipeline end to end", async () => {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "sitecraft-pipeline-")
  );

  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  let callIndex = 0;

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

  const responses: unknown[] = [
    plan,
    content,
    design,
    code,
    qa,
  ];

  try {
    // Configure an isolated test environment.
    process.env.SITECRAFT_DATA_DIR = tempDir;

    delete process.env.DATABASE_URL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.BYNARA_API_KEY;
    delete process.env.OPENAI_API_KEY;

    process.env.NVIDIA_API_KEY = "nvidia-key";
    process.env.NVIDIA_BASE_URL =
      "https://integrate.api.nvidia.com/v1";
    process.env.NVIDIA_MODEL =
      "qwen/qwen3-coder-480b-a35b-instruct";

    // Mock the AI provider with deterministic responses.
    globalThis.fetch = (async () => {
      assert.ok(
        callIndex < responses.length,
        `Unexpected extra AI request at index ${callIndex}`
      );

      const response = responses[callIndex++];

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(response),
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

    // Import after configuring the environment.
    const { createProject, getProject } =
      await import("./store.js");

    const { generateProject } =
      await import("./orchestrator.js");

    const project = await createProject({
      userId: "demo-user",
      name: "Northstar",
      description: "Demo",
      initialPrompt: "Build a studio site",
    });

    const result = await generateProject(
      project.id,
      "Build a studio site"
    );

    const stored = await getProject(project.id);

    // Verify generation and quality checks.
    assert.equal(result.qa.passed, true);
    assert.equal(result.qa.score, 98);
    assert.deepEqual(result.qa.issues, []);

    // Verify the generated plan.
    assert.equal(
      result.website.plan.siteName,
      plan.siteName
    );

    assert.equal(
      result.website.plan.pages.length,
      1
    );

    // Verify generated content.
    assert.equal(
      result.website.content.heroTitle,
      content.heroTitle
    );

    // Verify generated HTML.
    assert.ok(
      result.website.html.includes("Northstar Studio")
    );

    // Verify provider selection.
    assert.equal(result.provider, "nvidia");

    // Verify project persistence.
    assert.ok(stored);
    assert.equal(stored.status, "ready");

    assert.ok(
      stored.websites[0]?.generatedCode.html.includes(
        "Northstar Studio"
      )
    );

    // Verify every expected AI response was consumed.
    assert.equal(callIndex, responses.length);
  } finally {
    // Restore fetch even if an assertion or generation fails.
    globalThis.fetch = originalFetch;

    // Restore the original environment.
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }

    Object.assign(process.env, originalEnv);

    // Remove temporary test data.
    await rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
});
