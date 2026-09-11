import type { CodeBundle, ContentBundle, DesignSystem, WebsitePlan } from "./types.js";
import { createFiles, renderHtml } from "./generator.js";

function cleanTitle(value: string): string {
  const words = value.replace(/create|a|an|modern|responsive|editable|website|site|for|using|with|dark|light|theme|blue|purple|accent|accents|colors|color/gi, " ")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!words) return "Creative Showcase";
  return words.split(" ")
    .slice(0, 4)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

export function createLocalPlan(prompt: string): WebsitePlan {
  const lower = prompt.toLowerCase();

  const isPortfolio = lower.includes("portfolio") || lower.includes("engineer") || lower.includes("developer") || lower.includes("designer");
  const isRestaurant = lower.includes("restaurant") || lower.includes("cafe") || lower.includes("food") || lower.includes("dining");
  const isSaas = lower.includes("saas") || lower.includes("app") || lower.includes("software") || lower.includes("ai");
  const isAgency = lower.includes("agency") || lower.includes("studio") || lower.includes("digital");

  const type = isPortfolio ? "portfolio" : isRestaurant ? "restaurant" : isSaas ? "saas" : isAgency ? "agency" : "business";

  // Palette extraction
  const isDark = lower.includes("dark") || (!lower.includes("light") && isPortfolio);
  const primaryHex = lower.includes("purple") || lower.includes("violet") ? "#8b5cf6" : lower.includes("blue") ? "#3b82f6" : lower.includes("green") ? "#10b981" : lower.includes("orange") ? "#f97316" : "#6366f1";
  const secondaryHex = lower.includes("purple") ? "#a855f7" : lower.includes("blue") ? "#60a5fa" : lower.includes("green") ? "#34d399" : "#38bdf8";

  const palette = {
    primary: primaryHex,
    secondary: secondaryHex,
    background: isDark ? "#0f172a" : "#f8fafc",
    foreground: isDark ? "#f8fafc" : "#0f172a"
  };

  const nameTitle = cleanTitle(prompt);
  const siteName = isPortfolio
    ? (nameTitle.toLowerCase().includes("portfolio") ? nameTitle : `${nameTitle} Portfolio`)
    : nameTitle;

  const sections: string[] = ["hero"];
  if (lower.includes("about")) sections.push("about");
  if (lower.includes("skills") || isPortfolio) sections.push("skills");
  if (lower.includes("projects") || isPortfolio) sections.push("projects");
  if (lower.includes("menu") || isRestaurant) sections.push("menu");
  if (lower.includes("pricing") || isSaas) sections.push("pricing");
  if (lower.includes("testimonials") || lower.includes("reviews")) sections.push("testimonials");
  if (lower.includes("contact") || lower.includes("form")) sections.push("contact");
  sections.push("footer");

  return {
    siteName,
    siteDescription: `A high-impact ${type} website built around your specific prompt requirements.`,
    pages: [
      { name: "Home", slug: "/", pageType: "landing", sections }
    ],
    theme: isDark ? "dark-modern" : "light-editorial",
    colorPalette: palette,
    fontFamily: lower.includes("serif") ? "Georgia, serif" : "Inter, ui-sans-serif, system-ui, sans-serif",
    features: ["responsive", "accessible", "interactive-components", "contact-form", "smooth-scroll"]
  };
}

export function createLocalDesign(plan: WebsitePlan): DesignSystem {
  return {
    layout: `Responsive modular layout featuring styled hero header, custom components grid, interactive cards, and high-contrast typography.`,
    componentHierarchy: ["Navbar", "Hero", "AboutSection", "SkillsSection", "ProjectsSection", "TestimonialsSection", "ContactForm", "Footer"],
    tokens: {
      radius: "16px",
      spacing: "1.5rem",
      shadow: "0 20px 50px rgba(0,0,0,.3)"
    },
    responsiveRules: [
      "Full mobile responsiveness down to 360px viewport width",
      "Flexible grid columns auto-adjusting for desktop (3 cols), tablet (2 cols), and mobile (1 col)",
      "Accessible contrast ratios compliant with WCAG 2.1 AA guidelines"
    ]
  };
}

export function createLocalContent(plan: WebsitePlan, prompt: string): ContentBundle {
  const lower = prompt.toLowerCase();
  const isPortfolio = plan.siteName.toLowerCase().includes("portfolio") || lower.includes("portfolio") || lower.includes("engineer");

  return {
    heroTitle: isPortfolio
      ? "Full-Stack Engineer & Software Architect"
      : `Welcome to ${plan.siteName}`,
    heroSubtitle: isPortfolio
      ? "Building scalable web platforms, high-performance APIs, and intuitive user experiences with modern React, TypeScript, and AI integrations."
      : `Delivering exceptional results tailored specifically to your needs: ${prompt.slice(0, 120)}.`,
    primaryCta: isPortfolio ? "View Projects" : "Get Started",
    secondaryCta: "Contact Me",
    sections: [
      {
        title: isPortfolio ? "Technical Skills & Stack" : "Key Capabilities & Features",
        body: isPortfolio
          ? "Specialized in modern web technologies, cloud infrastructure, and responsive interface engineering."
          : "Structured to provide maximum clarity, performance, and audience engagement.",
        items: isPortfolio
          ? ["React & Next.js", "TypeScript & Node.js", "PostgreSQL & Prisma", "Tailwind CSS & Framer Motion", "REST & GraphQL APIs", "Docker & CI/CD"]
          : ["Responsive Mobile Architecture", "High-Contrast Accessible UI", "Custom Form Validation", "Performant Component Design"]
      },
      {
        title: isPortfolio ? "Featured Projects" : "Highlighted Work",
        body: "Real-world applications engineered for reliability, security, and scalability.",
        items: [
          "SiteCraft AI — Autonomous Prompt-to-Website Generation Agent",
          "CloudMetrics — Real-time Distributed Infrastructure Dashboard",
          "DevPulse — Developer Analytics & Code Review Platform"
        ]
      }
    ],
    testimonials: [
      {
        quote: "Delivered a flawless, high-performance web platform ahead of schedule with remarkable code quality.",
        name: "Alex Rivera",
        role: "VP of Engineering, TechCorp"
      },
      {
        quote: "The interface design and attention to mobile responsiveness exceeded our team's expectations.",
        name: "Sarah Chen",
        role: "Lead Product Designer"
      }
    ],
    faq: [
      {
        question: "Is this website code fully customizable?",
        answer: "Yes! All React components and Tailwind CSS styles are generated as clean TypeScript files that you can edit or export as a ZIP."
      },
      {
        question: "Does it support responsive mobile devices?",
        answer: "Yes, every component includes breakpoint adaptations for desktop, tablet, and mobile screens."
      }
    ],
    seo: {
      title: `${plan.siteName} — Built with SiteCraft AI`,
      description: plan.siteDescription
    }
  };
}

export function createLocalCode(plan: WebsitePlan, design: DesignSystem, content: ContentBundle): CodeBundle {
  const html = renderHtml(plan, design, content);
  return {
    html,
    files: createFiles(plan, design, content, html),
    assets: [
      { kind: "visual", description: "Dynamic CSS gradients and modern card layouts matching theme tokens." }
    ]
  };
}
