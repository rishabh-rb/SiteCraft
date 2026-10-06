
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
      description:
        "A clear, high-trust studio website.",
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
      shadow:
        "0 24px 80px rgba(0,0,0,.25)",
    },

    responsiveRules: [
      "Collapse navigation under 760px",
      "Use one-column cards under 900px",
    ],
  };

  const code = {
    html:
      "<main><h1>Northstar Studio</h1></main>",

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
        content:
          "# Northstar Studio",
      },
      {
        path: "package.json",
        language: "json",
        content:
          '{"name":"northstar-studio"}',
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

  /*
   * The orchestrator is expected to call the AI provider
   * five times:
   *
   * 1. Planner
   * 2. Content
   * 3. UI / Design
   * 4. Code
   * 5. QA
   */
  const responses = [
    plan,
    content,
    design,
    code,
    qa,
  ];

  let callIndex = 0;

  const requests: Array<{
    input: string;
    init?: RequestInit;
  }> = [];

  /*
   * Use an isolated data directory so this test never
   * modifies the real SiteCraft data.
   */
  process.env.SITECRAFT_DATA_DIR = tempDir;

  /*
   * Disable all other providers so NVIDIA must be selected.
   */
  delete process.env.DATABASE_URL;
  delete process.env.GEMINI_API_KEY;
  delete process.env.BYNARA_API_KEY;
  delete process.env.OPENAI_API_KEY;

  process.env.NVIDIA_API_KEY = "nvidia-key";
  process.env.NVIDIA_BASE_URL =
    "https://integrate.api.nvidia.com/v1";
  process.env.NVIDIA_MODEL =
    "qwen/qwen3-coder-480b-a35b-instruct";

  /*
   * Mock NVIDIA API.
   */
  globalThis.fetch = (async (input, init) => {
    const request = {
      input: String(input),
      init,
    };

    requests.push(request);

    assert.ok(
      callIndex < responses.length,
      "The generation pipeline made more AI calls than expected"
    );

    const response = responses[callIndex];

    callIndex += 1;

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

  try {
    const { createProject, getProject } =
      await import("./store.js");

    const { generateProject } =
      await import("./orchestrator.js");

    /*
     * Create a real project.
     */
    const project = await createProject({
      userId: "demo-user",
      name: "Northstar",
      description: "Demo",
      initialPrompt: "Build a studio site",
    });

    assert.ok(
      project.id,
      "Project should have an ID"
    );

    assert.equal(
      project.name,
      "Northstar",
      "Project name should be stored correctly"
    );

    assert.equal(
      project.userId,
      "demo-user",
      "Project should belong to the correct user"
    );

    /*
     * Run the complete generation pipeline.
     */
    const result = await generateProject(
      project.id,
      "Build a studio site"
    );

    /*
     * Read the project again from storage.
     */
    const stored = await getProject(project.id);

    /*
     * ----------------------------------------------------
     * Provider / API assertions
     * ----------------------------------------------------
     */

    assert.equal(
      callIndex,
      5,
      "Pipeline should make exactly 5 AI calls"
    );

    assert.equal(
      requests.length,
      5,
      "Exactly 5 mocked provider requests should be made"
    );

    assert.ok(
      requests.every((request) =>
        request.input.includes(
          "integrate.api.nvidia.com"
        )
      ),
      "All AI requests should use the NVIDIA API"
    );

    assert.ok(
      requests.every(
        (request) =>
          request.init?.method === "POST"
      ),
      "All AI requests should use POST"
    );

    assert.ok(
      requests.every(
        (request) =>
          typeof request.init?.body === "string"
      ),
      "Every AI request should contain a request body"
    );

    /*
     * Check that every request contains valid JSON.
     */
    const parsedRequests = requests.map(
      (request) => {
        assert.ok(
          typeof request.init?.body === "string",
          "Request body should be a string"
        );

        const body = JSON.parse(
          request.init.body
        );

        assert.ok(
          body,
          "Request body should contain JSON"
        );

        return body;
      }
    );

    assert.equal(
      parsedRequests.length,
      5,
      "All five provider requests should contain valid JSON"
    );

    /*
     * Check the configured NVIDIA model only if
     * the provider sends a model field.
     */
    for (const body of parsedRequests) {
      if ("model" in body) {
        assert.equal(
          body.model,
          "qwen/qwen3-coder-480b-a35b-instruct",
          "Provider should use the configured NVIDIA model"
        );
      }
    }

    assert.equal(
      result.provider,
      "nvidia",
      "NVIDIA should be selected as the AI provider"
    );

    /*
     * ----------------------------------------------------
     * QA assertions
     * ----------------------------------------------------
     */

    assert.equal(
      result.qa.passed,
      true,
      "QA should pass"
    );

    assert.equal(
      result.qa.score,
      98,
      "QA score should match the mocked response"
    );

    assert.deepEqual(
      result.qa.issues,
      [],
      "QA should contain no issues"
    );

    /*
     * ----------------------------------------------------
     * Plan assertions
     * ----------------------------------------------------
     */

    assert.equal(
      result.website.plan.siteName,
      plan.siteName,
      "Generated site name should match the plan"
    );

    assert.equal(
      result.website.plan.siteDescription,
      plan.siteDescription,
      "Generated site description should match the plan"
    );

    assert.equal(
      result.website.plan.theme,
      plan.theme,
      "Generated theme should match the plan"
    );

    assert.equal(
      result.website.plan.fontFamily,
      plan.fontFamily,
      "Generated font family should match the plan"
    );

    assert.deepEqual(
      result.website.plan.colorPalette,
      plan.colorPalette,
      "Generated color palette should match the plan"
    );

    assert.deepEqual(
      result.website.plan.features,
      plan.features,
      "Generated features should match the plan"
    );

    assert.equal(
      result.website.plan.pages.length,
      1,
      "Generated plan should contain one page"
    );

    assert.equal(
      result.website.plan.pages[0].name,
      "Home",
      "Generated page should be Home"
    );

    assert.equal(
      result.website.plan.pages[0].slug,
      "/",
      "Home page should use the root slug"
    );

    assert.equal(
      result.website.plan.pages[0].pageType,
      "landing",
      "Home page should be a landing page"
    );

    /*
     * ----------------------------------------------------
     * Content assertions
     * ----------------------------------------------------
     */

    assert.equal(
      result.website.content.heroTitle,
      content.heroTitle,
      "Generated hero title should match the content"
    );

    assert.equal(
      result.website.content.heroSubtitle,
      content.heroSubtitle,
      "Generated hero subtitle should match the content"
    );

    assert.equal(
      result.website.content.primaryCta,
      content.primaryCta,
      "Generated primary CTA should match the content"
    );

    assert.equal(
      result.website.content.secondaryCta,
      content.secondaryCta,
      "Generated secondary CTA should match the content"
    );

    assert.equal(
      result.website.content.sections.length,
      1,
      "Generated content should contain one section"
    );

    assert.equal(
      result.website.content.sections[0].title,
      "Built for momentum",
      "Generated section title should match"
    );

    assert.equal(
      result.website.content.testimonials.length,
      1,
      "Generated content should contain one testimonial"
    );

    assert.equal(
      result.website.content.testimonials[0].name,
      "Ava Chen",
      "Generated testimonial should match"
    );

    assert.equal(
      result.website.content.faq.length,
      1,
      "Generated content should contain one FAQ"
    );

    assert.equal(
      result.website.content.faq[0].question,
      "Do you support revisions?",
      "Generated FAQ question should match"
    );

    assert.equal(
      result.website.content.seo.title,
      content.seo.title,
      "SEO title should match"
    );

    /*
     * ----------------------------------------------------
     * Design assertions
     * ----------------------------------------------------
     */

    assert.equal(
      result.website.design.layout,
      design.layout,
      "Generated design layout should match"
    );

    assert.deepEqual(
      result.website.design.componentHierarchy,
      design.componentHierarchy,
      "Component hierarchy should be preserved"
    );

    assert.deepEqual(
      result.website.design.responsiveRules,
      design.responsiveRules,
      "Responsive rules should be preserved"
    );

    assert.deepEqual(
      result.website.design.tokens,
      design.tokens,
      "Design tokens should be preserved"
    );

    /*
     * ----------------------------------------------------
     * Generated code assertions
     * ----------------------------------------------------
     */

    assert.ok(
      typeof result.website.html === "string",
      "Generated HTML should be a string"
    );

    assert.ok(
      result.website.html.length > 0,
      "Generated HTML should not be empty"
    );

    assert.ok(
      result.website.html.includes(
        "Northstar Studio"
      ),
      "Generated HTML should contain the site name"
    );

    assert.ok(
      result.website.html.includes("<main>"),
      "Generated HTML should contain the main element"
    );

    assert.ok(
      Array.isArray(result.website.files),
      "Generated files should be an array"
    );

    assert.equal(
      result.website.files.length,
      code.files.length,
      "Generated file count should match the mocked response"
    );

    assert.ok(
      result.website.files.some(
        (file) =>
          file.path === "src/index.tsx"
      ),
      "Generated files should contain src/index.tsx"
    );

    assert.ok(
      result.website.files.some(
        (file) =>
          file.path === "README.md"
      ),
      "Generated files should contain README.md"
    );

    assert.ok(
      result.website.files.some(
        (file) =>
          file.path === "package.json"
      ),
      "Generated files should contain package.json"
    );

    for (const file of result.website.files) {
      assert.ok(
        file.path,
        "Every generated file should have a path"
      );

      assert.ok(
        typeof file.content === "string",
        `Generated file ${file.path} should contain string content`
      );
    }

    assert.ok(
      Array.isArray(result.website.assets),
      "Generated assets should be an array"
    );

    assert.equal(
      result.website.assets.length,
      code.assets.length,
      "Generated assets should be preserved"
    );

    /*
     * ----------------------------------------------------
     * Storage assertions
     * ----------------------------------------------------
     */

    assert.ok(
      stored,
      "Project should be stored after generation"
    );

    assert.equal(
      stored.status,
      "ready",
      "Stored project should be ready"
    );

    assert.equal(
      stored.userId,
      "demo-user",
      "Stored project should belong to the correct user"
    );

    assert.equal(
      stored.websites.length,
      1,
      "Project should contain exactly one generated website"
    );

    const storedWebsite =
      stored.websites[0];

    assert.ok(
      storedWebsite,
      "Stored website should exist"
    );

    assert.equal(
      storedWebsite.title,
      plan.siteName,
      "Stored website title should match the plan"
    );

    assert.equal(
      storedWebsite.description,
      plan.siteDescription,
      "Stored website description should match the plan"
    );

    assert.equal(
      storedWebsite.theme,
      plan.theme,
      "Stored website theme should match the plan"
    );

    assert.equal(
      storedWebsite.fontFamily,
      plan.fontFamily,
      "Stored website font family should match the plan"
    );

    assert.ok(
      storedWebsite.generatedCode,
      "Stored website should contain generated code"
    );

    /*
     * ----------------------------------------------------
     * Stored generated data consistency
     * ----------------------------------------------------
     */

    assert.equal(
      storedWebsite.generatedCode.html,
      result.website.html,
      "Stored HTML should match returned HTML"
    );

    assert.deepEqual(
      storedWebsite.generatedCode.plan,
      result.website.plan,
      "Stored plan should match returned plan"
    );

    assert.deepEqual(
      storedWebsite.generatedCode.content,
      result.website.content,
      "Stored content should match returned content"
    );

    assert.deepEqual(
      storedWebsite.generatedCode.design,
      result.website.design,
      "Stored design should match returned design"
    );

    assert.deepEqual(
      storedWebsite.generatedCode.qa,
      result.website.qa,
      "Stored QA should match returned QA"
    );

    assert.equal(
      storedWebsite.generatedCode.plan.siteName,
      plan.siteName,
      "Stored plan should contain the generated site name"
    );

    assert.equal(
      storedWebsite.generatedCode.content.heroTitle,
      content.heroTitle,
      "Stored content should contain the generated hero title"
    );

    assert.ok(
      storedWebsite.generatedCode.html.includes(
        "Northstar Studio"
      ),
      "Stored generated HTML should contain the site name"
    );

    assert.equal(
      storedWebsite.generatedCode.qa.passed,
      true,
      "Stored QA result should remain successful"
    );

    /*
     * ----------------------------------------------------
     * Final consistency checks
     * ----------------------------------------------------
     */

    assert.deepEqual(
      storedWebsite.generatedCode.files,
      result.website.files,
      "Stored files should match returned files"
    );

    assert.deepEqual(
      storedWebsite.generatedCode.assets,
      result.website.assets,
      "Stored assets should match returned assets"
    );

    /*
     * If we reached this point, the complete pipeline
     * successfully generated, validated, and stored
     * the website.
     */
  } finally {
    /*
     * Restore fetch first so later tests are unaffected.
     */
    globalThis.fetch = originalFetch;

    /*
     * Restore the original environment safely.
     *
     * Do not use:
     * process.env = originalEnv
     *
     * because replacing process.env wholesale can behave
     * differently across Node.js versions.
     */
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

    /*
     * Remove the temporary test database/data directory.
     */
    await rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
});
