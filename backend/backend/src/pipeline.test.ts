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

const responses = [plan, content, design, code, qa];

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

globalThis.fetch = (async (input, init) => {
requests.push({
input: String(input),
init,
});

```
assert.ok(
  callIndex < responses.length,
  "The generation pipeline made more AI calls than expected"
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

assert.ok(project.id, "Project should have an ID");

const result = await generateProject(
  project.id,
  "Build a studio site"
);

const stored = await getProject(project.id);

assert.equal(
  callIndex,
  responses.length,
  "Pipeline should make exactly 5 AI calls"
);

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

assert.equal(
  result.website.plan.siteName,
  plan.siteName,
  "Generated site name should match the plan"
);

assert.equal(
  result.website.plan.theme,
  plan.theme,
  "Generated theme should match the plan"
);

assert.equal(
  result.website.content.heroTitle,
  content.heroTitle,
  "Generated hero title should match the content"
);

assert.equal(
  result.website.content.primaryCta,
  content.primaryCta,
  "Generated CTA should match the content"
);

assert.ok(
  result.website.html.includes("Northstar Studio"),
  "Generated HTML should contain the site name"
);

assert.ok(
  result.website.html.includes("<main>"),
  "Generated HTML should contain the main element"
);

assert.equal(
  result.website.design.layout,
  design.layout,
  "Generated design should match the design response"
);

assert.equal(
  result.website.design.componentHierarchy.length,
  design.componentHierarchy.length,
  "Component hierarchy should be preserved"
);

assert.equal(
  result.website.generatedCode.files.length,
  code.files.length,
  "Generated files should be preserved"
);

assert.equal(
  result.provider,
  "nvidia",
  "NVIDIA should be selected as the AI provider"
);

assert.ok(
  requests.length > 0,
  "The pipeline should make an API request"
);

assert.ok(
  requests.every((request) =>
    request.input.includes("integrate.api.nvidia.com")
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
  stored,
  "Project should be stored after generation"
);

assert.equal(
  stored.status,
  "ready",
  "Stored project should be ready"
);

assert.equal(
  stored.websites.length,
  1,
  "Project should contain exactly one generated website"
);

assert.ok(
  stored.websites[0]?.generatedCode?.html?.includes(
    "Northstar Studio"
  ),
  "Stored generated HTML should contain the site name"
);

assert.equal(
  stored.websites[0]?.plan?.siteName,
  plan.siteName,
  "Stored plan should contain the generated site name"
);

assert.equal(
  stored.websites[0]?.content?.heroTitle,
  content.heroTitle,
  "Stored content should contain the generated hero title"
);
```

} finally {
globalThis.fetch = originalFetch;

```
process.env = originalEnv;

await rm(tempDir, {
  recursive: true,
  force: true,
});
```

}
});
