import { ArrowRight, Bot, Braces, CheckCircle2, Download, Gauge, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const features = [
  { icon: Bot, title: "Multi-agent pipeline", body: "Planner, UI, content, image, code, and QA stages are separated for cleaner iteration." },
  { icon: Braces, title: "Generated React files", body: "The backend returns a real exportable project with code files, metadata, and README content." },
  { icon: ShieldCheck, title: "Safer previews", body: "Generated HTML renders inside a sandboxed iframe, keeping the parent app isolated." },
  { icon: Download, title: "ZIP export", body: "Download the generated website without leaking server-side secrets." }
];

const steps = ["Create a project", "Describe the website", "Review plan and preview", "Iterate with chat", "Export the ZIP"];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <nav className="fixed left-0 right-0 top-0 z-20 border-b border-white/15 bg-ink/55 text-white backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <a className="text-base font-black tracking-normal" href="#top">
            SiteCraft AI
          </a>
          <div className="hidden items-center gap-7 text-sm text-white/78 md:flex">
            <a href="#workflow">Workflow</a>
            <a href="#features">Features</a>
            <a href="#agents">Agents</a>
          </div>
          <ButtonLink href="/dashboard" variant="accent" className="h-9">
            Start Building <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </nav>

      <section
        id="top"
        className="relative flex min-h-[86vh] items-end overflow-hidden bg-ink text-white"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(17,19,21,.88), rgba(17,19,21,.48), rgba(17,19,21,.18)), url(https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2200&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-28">
          <p className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/76">
            <Sparkles className="h-4 w-4 text-accent" /> Autonomous prompt-to-website generation
          </p>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-normal md:text-7xl">
            Turn your ideas into websites with AI
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
            Describe your website in plain English and SiteCraft AI designs, builds, previews, validates, and exports it for you.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/dashboard" variant="accent">
              Start Building <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/builder/demo" variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/18">
              View Demo
            </ButtonLink>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold text-teal">How it works</p>
            <h2 className="mt-3 text-3xl font-black tracking-normal md:text-5xl">A clean generation loop, built for demos and real use.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step} className="rounded-lg border border-line bg-paper p-5">
                <span className="text-sm font-black text-accent">0{index + 1}</span>
                <p className="mt-3 text-lg font-bold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-4 md:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-lg border border-line bg-white p-5 shadow-soft">
              <Icon className="h-6 w-6 text-accent" />
              <h3 className="mt-5 text-lg font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/68">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="agents" className="border-y border-line bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm font-bold text-accent">AI agents</p>
            <h2 className="mt-3 text-4xl font-black tracking-normal">Planner to QA, each piece has a job.</h2>
          </div>
          <div className="grid gap-3">
            {["Planner", "UI Designer", "Content", "Image", "Code", "QA", "Orchestrator"].map((agent) => (
              <div key={agent} className="flex items-center justify-between border-b border-white/12 py-3">
                <span className="font-semibold">{agent} Agent</span>
                <CheckCircle2 className="h-5 w-5 text-teal" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-16 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-6">
          <Layers3 className="h-6 w-6 text-teal" />
          <h3 className="mt-4 font-black">Stack</h3>
          <p className="mt-2 text-sm text-ink/68">Next.js, TypeScript, Tailwind, Auth.js, PostgreSQL, Prisma, NVIDIA NIM.</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-6">
          <Gauge className="h-6 w-6 text-teal" />
          <h3 className="mt-4 font-black">MVP target</h3>
          <p className="mt-2 text-sm text-ink/68">Fast prompt-to-preview flow, with timing depending on provider and prompt complexity.</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-6">
          <ShieldCheck className="h-6 w-6 text-teal" />
          <h3 className="mt-4 font-black">Security</h3>
          <p className="mt-2 text-sm text-ink/68">Server-side secrets, request validation, sandboxed preview, and structured errors.</p>
        </div>
      </section>
    </main>
  );
}
