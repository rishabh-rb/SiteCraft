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
'<main><h1>Northstar Studio</h1></main>',
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
assets: [],
};

const qa = {
passed: true,
score: 98,
issues: [],
};

/*

* The real orchestrator makes 5 NVIDIA/provider calls:
*
* 1. planner
* 2. content
* 3. ui
* 4. code
* 5. qa
*
* The image agent is separate and does not call the NVIDIA
* provider directly.
  */
  const responses = [
  plan,
  content,
  design,
  code,
  qa,
  ];

let callIndex = 0;
const requests = [];

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

/*

* Mock NVIDIA API.
*
* Every provider request receives the next response
* from the pipeline.
  */
  globalThis.fetch = (async (input, init) => {
  const url = String(input);

```
requests.push({
```

```
  url,
  method: init?.method,
  body: init?.body,
});

assert.ok(
  callIndex < responses.length,
  "Pipeline made more NVIDIA API calls than expected"
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
```

}) as typeof fetch;

try {
const { createProject, getProject } =
await import("./store.js");

```
const { generateProject } =
  await import("./orchestrator.js");

const project = await createProject({
  userId: "demo-user",
  name: "Northstar",
  description: "Demo",
  initialPrompt: "Build a studio site",
});

assert.ok(
  project.id,
  "Project should be created with an ID"
);

assert.equal(
  project.name,
  "Northstar",
  "Project name should be stored correctly"
);

const result = await generateProject(
  project.id,
  "Build a studio site"
);

const stored = await getProject(project.id);

/*
 * ---------------------------------------------------------
 * Provider/API assertions
 * ---------------------------------------------------------
 */

assert.equal(
  callIndex,
  5,
  "Pipeline should make exactly 5 NVIDIA provider calls"
);

assert.equal(
  requests.length,
  5,
  "Exactly 5 mocked NVIDIA requests should be made"
);

assert.ok(
  requests.every((request) =>
    request.url.includes(
      "integrate.api.nvidia.com"
    )
  ),
  "All provider requests should use the NVIDIA API"
);

assert.ok(
  requests.every(
    (request) => request.method === "POST"
  ),
  "All provider requests should use POST"
);

assert.ok(
  requests.every(
    (request) => typeof request.body === "string"
  ),
  "Every provider request should contain a request body"
);

/*
 * ---------------------------------------------------------
 * Provider result
 * ---------------------------------------------------------
 */

assert.equal(
  result.provider,
  "nvidia",
  "The active provider should be NVIDIA"
);

/*
 * ---------------------------------------------------------
 * QA assertions
 * ---------------------------------------------------------
 */

assert.equal(
  result.qa.passed,
  true,
  "Generated website should pass QA"
);

assert.equal(
  result.qa.score,
  98,
  "QA score should be 98"
);

assert.deepEqual(
  result.qa.issues,
  [],
  "QA should contain no issues"
);

/*
 * ---------------------------------------------------------
 * Plan assertions
 * ---------------------------------------------------------
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

assert.equal(
  result.website.plan.pages.length,
  1,
  "Generated plan should contain one page"
);

assert.equal(
  result.website.plan.pages[0].name,
  "Home",
  "Generated page name should be Home"
);

/*
 * ---------------------------------------------------------
 * Content assertions
 * ---------------------------------------------------------
 */

assert.equal(
  result.website.content.heroTitle,
  content.heroTitle,
  "Hero title should match generated content"
);

assert.equal(
  result.website.content.heroSubtitle,
  content.heroSubtitle,
  "Hero subtitle should match generated content"
);

assert.equal(
  result.website.content.primaryCta,
  content.primaryCta,
  "Primary CTA should match generated content"
);

assert.equal(
  result.website.content.secondaryCta,
  content.secondaryCta,
  "Secondary CTA should match generated content"
);

assert.equal(
  result.website.content.sections.length,
  1,
  "Generated content should contain one section"
);

assert.equal(
  result.website.content.testimonials.length,
  1,
  "Generated content should contain one testimonial"
);

assert.equal(
  result.website.content.faq.length,
  1,
  "Generated content should contain one FAQ item"
);

/*
 * ---------------------------------------------------------
 * Design assertions
 * ---------------------------------------------------------
 */

assert.equal(
  result.website.design.layout,
  design.layout,
  "Design layout should match generated design"
);

assert.deepEqual(
  result.website.design.componentHierarchy,
  design.componentHierarchy,
  "Component hierarchy should match generated design"
);

assert.equal(
  result.website.design.tokens.radius,
  design.tokens.radius,
  "Design radius token should match"
);

assert.equal(
  result.website.design.tokens.spacing,
  design.tokens.spacing,
  "Design spacing token should match"
);

assert.equal(
  result.website.design.tokens.shadow,
  design.tokens.shadow,
  "Design shadow token should match"
);

/*
 * ---------------------------------------------------------
 * Generated code assertions
 * ---------------------------------------------------------
 */

assert.ok(
  typeof result.website.html === "string",
  "Generated HTML should be a string"
);

assert.ok(
  result.website.html.includes(
    "Northstar Studio"
  ),
  "Generated HTML should contain the site name"
);

assert.ok(
  result.website.html.includes("<main"),
  "Generated HTML should contain a main element"
);

assert.ok(
  Array.isArray(result.website.files),
  "Generated files should be an array"
);

assert.ok(
  result.website.files.length >= 2,
  "Generated project should contain multiple files"
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

/*
 * ---------------------------------------------------------
 * Stored project assertions
 * ---------------------------------------------------------
 */

assert.ok(
  stored,
  "Generated project should be stored"
);

assert.equal(
  stored.status,
  "ready",
  "Project status should be ready after successful generation"
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

assert.ok(
  storedWebsite.generatedCode,
  "Stored website should contain generated code"
);

assert.equal(
  storedWebsite.generatedCode.plan.siteName,
  plan.siteName,
  "Stored generated plan should contain the correct site name"
);

assert.equal(
  storedWebsite.generatedCode.content.heroTitle,
  content.heroTitle,
  "Stored generated content should contain the correct hero title"
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
  "Stored generated website should retain QA status"
);

/*
 * ---------------------------------------------------------
 * Final consistency checks
 * ---------------------------------------------------------
 */

assert.equal(
  storedWebsite.generatedCode.html,
  result.website.html,
  "Stored HTML should match the returned HTML"
);

assert.deepEqual(
  storedWebsite.generatedCode.plan,
  result.website.plan,
  "Stored plan should match the returned plan"
);

assert.deepEqual(
  storedWebsite.generatedCode.content,
  result.website.content,
  "Stored content should match the returned content"
);
```

} finally {
/*
* Always restore the original environment and fetch
* implementation, even if an assertion fails.
*/
globalThis.fetch = originalFetch;

```
for (const key of Object.keys(process.env)) {
  if (!(key in originalEnv)) {
    delete process.env[key];
  }
}

for (const [key, value] of Object.entries(
  originalEnv
)) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

await rm(tempDir, {
  recursive: true,
  force: true,
});
```

}
});
