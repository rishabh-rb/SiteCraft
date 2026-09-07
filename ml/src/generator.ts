import type { ContentBundle, DesignSystem, GeneratedFile, WebsitePlan } from "./types.js";
import type { ImageAsset } from "./image-agent.js";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function sectionHtml(section: ContentBundle["sections"][number], index: number, image?: ImageAsset): string {
  const items = section.items?.map((item, i) => `
    <div class="card">
      <div class="badge font-bold">0${i + 1}</div>
      <p class="item-title">${escapeHtml(item)}</p>
    </div>
  `).join("") ?? "";

  const imageMarkup = image ? `
    <div class="section-image-wrapper">
      <img class="section-image" src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" loading="lazy" />
    </div>
  ` : "";

  return `
    <section class="content-section" id="section-${index + 1}" aria-label="${escapeHtml(section.title)}">
      <div class="container">
        <div class="section-header-grid ${image ? 'has-image' : ''}">
          <div class="section-text">
            <span class="eyebrow">${escapeHtml(section.title.toUpperCase())}</span>
            <h2 class="section-heading">${escapeHtml(section.title)}</h2>
            <p class="section-body">${escapeHtml(section.body)}</p>
          </div>
          ${imageMarkup}
        </div>
        ${items ? `<div class="cards-grid">${items}</div>` : ""}
      </div>
    </section>
  `;
}

export function renderHtml(plan: WebsitePlan, design: DesignSystem, content: ContentBundle, assets: ImageAsset[] = []): string {
  const { primary, secondary, background, foreground } = plan.colorPalette;
  const heroImage = assets.find((a) => a.kind === "hero") || assets[0];
  const featureImage1 = assets.find((a) => a.kind === "feature-1") || assets[1];
  const featureImage2 = assets.find((a) => a.kind === "feature-2") || assets[2];
  const aboutImage = assets.find((a) => a.kind === "about") || assets[3];

  const sectionImages = [featureImage1, featureImage2, aboutImage].filter(Boolean);

  const sectionsMarkup = content.sections.map((section, idx) => sectionHtml(section, idx, sectionImages[idx % sectionImages.length])).join("");

  const testimonialsMarkup = content.testimonials.map((item) => `
    <article class="quote-card">
      <p class="quote-text">“${escapeHtml(item.quote)}”</p>
      <div class="quote-author">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.role)}</span>
      </div>
    </article>
  `).join("");

  const faqMarkup = content.faq.map((item) => `
    <details class="faq-item">
      <summary class="faq-question">${escapeHtml(item.question)}</summary>
      <p class="faq-answer">${escapeHtml(item.answer)}</p>
    </details>
  `).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(content.seo.description)}">
  <title>${escapeHtml(content.seo.title)}</title>
  <style>
    :root {
      --primary: ${primary};
      --secondary: ${secondary};
      --bg: ${background};
      --fg: ${foreground};
      --muted: color-mix(in srgb, var(--fg) 70%, transparent);
      --card-bg: color-mix(in srgb, var(--fg) 5%, transparent);
      --card-hover: color-mix(in srgb, var(--fg) 9%, transparent);
      --line: color-mix(in srgb, var(--fg) 14%, transparent);
      --radius: ${design.tokens.radius || "16px"};
      --font: ${plan.fontFamily};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--fg); font-family: var(--font); line-height: 1.6; -webkit-font-smoothing: antialiased; }
    a { text-decoration: none; color: inherit; }
    .container { max-width: 1140px; margin: 0 auto; padding: 0 24px; }
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: color-mix(in srgb, var(--bg) 85%, transparent); backdrop-filter: blur(12px); z-index: 50; }
    .brand { font-size: 1.25rem; font-weight: 900; letter-spacing: -0.03em; color: var(--fg); }
    .nav-links { display: flex; gap: 24px; font-size: 0.9rem; font-weight: 600; color: var(--muted); }
    .nav-links a:hover { color: var(--primary); }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 24px; border-radius: 9999px; background: var(--primary); color: #ffffff; font-weight: 700; font-size: 0.9rem; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); border: none; cursor: pointer; text-decoration: none; box-shadow: 0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent); }
    .btn:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 45%, transparent); }
    .btn-secondary { background: color-mix(in srgb, var(--fg) 8%, transparent); border: 1px solid var(--line); color: var(--fg); box-shadow: none; }
    .btn-secondary:hover { background: color-mix(in srgb, var(--fg) 14%, transparent); }
    .hero { padding: 90px 0 70px; }
    .hero-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 48px; align-items: center; }
    .hero-text { text-align: left; }
    .eyebrow { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: var(--primary); display: inline-block; margin-bottom: 12px; }
    .hero-title { font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 900; line-height: 1.08; letter-spacing: -0.04em; margin-bottom: 20px; color: var(--fg); }
    .hero-subtitle { font-size: 1.15rem; color: var(--muted); margin-bottom: 32px; max-width: 600px; line-height: 1.6; }
    .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; }
    .hero-image-wrapper { position: relative; border-radius: var(--radius); overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.25); border: 1px solid var(--line); }
    .hero-image { width: 100%; height: 380px; object-fit: cover; display: block; }
    .content-section { padding: 80px 0; border-top: 1px solid var(--line); }
    .section-header-grid { display: grid; gap: 32px; margin-bottom: 36px; }
    .section-header-grid.has-image { grid-template-columns: 1fr 1fr; align-items: center; }
    .section-image-wrapper { border-radius: var(--radius); overflow: hidden; border: 1px solid var(--line); box-shadow: 0 16px 40px rgba(0,0,0,0.15); }
    .section-image { width: 100%; height: 260px; object-fit: cover; display: block; }
    .section-heading { font-size: clamp(1.8rem, 3.5vw, 2.75rem); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 12px; }
    .section-body { font-size: 1.05rem; color: var(--muted); max-width: 640px; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
    .card { background: var(--card-bg); border: 1px solid var(--line); border-radius: var(--radius); padding: 24px; transition: transform 0.2s, background 0.2s; }
    .card:hover { transform: translateY(-2px); background: var(--card-hover); }
    .badge { display: inline-block; font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; background: color-mix(in srgb, var(--primary) 20%, transparent); color: var(--primary); margin-bottom: 12px; }
    .item-title { font-size: 1rem; font-weight: 700; color: var(--fg); }
    .quotes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 32px; }
    .quote-card { background: var(--card-bg); border: 1px solid var(--line); border-radius: var(--radius); padding: 28px; }
    .quote-text { font-size: 1.05rem; font-style: italic; margin-bottom: 16px; color: var(--fg); line-height: 1.6; }
    .quote-author strong { display: block; font-size: 0.95rem; }
    .quote-author span { font-size: 0.85rem; color: var(--muted); }
    .faq-item { background: var(--card-bg); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 20px; margin-bottom: 12px; cursor: pointer; }
    .faq-question { font-weight: 700; font-size: 1rem; }
    .faq-answer { margin-top: 10px; font-size: 0.95rem; color: var(--muted); }
    .contact-container { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .contact-form { width: 100%; max-width: 560px; background: var(--card-bg); border: 1px solid var(--line); border-radius: var(--radius); padding: 32px; margin-top: 24px; text-align: left; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 6px; }
    .form-group input, .form-group textarea { width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); font-family: inherit; font-size: 0.95rem; outline: none; transition: border-color 0.2s; }
    .form-group input:focus, .form-group textarea:focus { border-color: var(--primary); }
    .footer { border-top: 1px solid var(--line); padding: 40px 0; font-size: 0.85rem; color: var(--muted); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .hero { padding: 50px 0; }
      .hero-grid { grid-template-columns: 1fr; }
      .section-header-grid.has-image { grid-template-columns: 1fr; }
      .cards-grid, .quotes-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="site">
    <nav class="container nav" aria-label="Main Navigation">
      <a class="brand" href="#top">${escapeHtml(plan.siteName)}</a>
      <div class="nav-links">
        <a href="#section-1">Features</a>
        <a href="#testimonials">Testimonials</a>
        <a href="#faq">FAQ</a>
        <a href="#contact">Contact</a>
      </div>
      <a class="btn" href="#contact">${escapeHtml(content.primaryCta)}</a>
    </nav>

    <main>
      <section class="hero container" id="top" aria-label="Hero Section">
        <div class="hero-grid">
          <div class="hero-text">
            <span class="eyebrow">${escapeHtml(plan.theme)}</span>
            <h1 class="hero-title">${escapeHtml(content.heroTitle)}</h1>
            <p class="hero-subtitle">${escapeHtml(content.heroSubtitle)}</p>
            <div class="hero-actions">
              <a class="btn" href="#contact">${escapeHtml(content.primaryCta)}</a>
              <a class="btn btn-secondary" href="#section-1">${escapeHtml(content.secondaryCta)}</a>
            </div>
          </div>
          ${heroImage ? `
          <div class="hero-image-wrapper">
            <img class="hero-image" src="${escapeHtml(heroImage.url)}" alt="${escapeHtml(heroImage.alt)}" loading="eager" />
          </div>
          ` : ""}
        </div>
      </section>

      ${sectionsMarkup}

      ${testimonialsMarkup ? `
      <section class="content-section" id="testimonials" aria-label="Client Testimonials">
        <div class="container">
          <span class="eyebrow">TESTIMONIALS</span>
          <h2 class="section-heading">Trusted by Industry Leaders</h2>
          <div class="quotes-grid">${testimonialsMarkup}</div>
        </div>
      </section>
      ` : ""}

      ${faqMarkup ? `
      <section class="content-section" id="faq" aria-label="Frequently Asked Questions">
        <div class="container">
          <span class="eyebrow">FAQ</span>
          <h2 class="section-heading">Frequently Asked Questions</h2>
          <div style="margin-top: 24px;">${faqMarkup}</div>
        </div>
      </section>
      ` : ""}

      <section class="content-section" id="contact" aria-label="Contact Section">
        <div class="container contact-container">
          <span class="eyebrow">GET IN TOUCH</span>
          <h2 class="section-heading">Start Your Project Today</h2>
          <p class="section-body">Have a question or request? Fill out the form below to connect with us.</p>
          <form class="contact-form" onsubmit="event.preventDefault(); alert('Message sent successfully!');">
            <div class="form-group">
              <label for="name">Your Name</label>
              <input type="text" id="name" required placeholder="Jane Doe" />
            </div>
            <div class="form-group">
              <label for="email">Your Email</label>
              <input type="email" id="email" required placeholder="jane@example.com" />
            </div>
            <div class="form-group">
              <label for="message">Message</label>
              <textarea id="message" rows="4" required placeholder="Tell us about your project..."></textarea>
            </div>
            <button class="btn" style="width: 100%;" type="submit">Submit Request</button>
          </form>
        </div>
      </section>
    </main>

    <footer class="container footer" role="contentinfo">
      <span>© ${new Date().getFullYear()} ${escapeHtml(plan.siteName)}. All rights reserved.</span>
      <span>Generated autonomously with SiteCraft AI</span>
    </footer>
  </div>
</body>
</html>`;
}

export function createFiles(plan: WebsitePlan, design: DesignSystem, content: ContentBundle, html: string, assets: ImageAsset[] = []): GeneratedFile[] {
  const heroImage = assets.find((a) => a.kind === "hero")?.url || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80";

  const navbarComponent = `import React from "react";

export function Navbar() {
  return (
    <nav className="nav container" aria-label="Main Navigation">
      <a href="#top" className="brand">${plan.siteName}</a>
      <div className="nav-links">
        <a href="#features">Features</a>
        <a href="#testimonials">Testimonials</a>
        <a href="#faq">FAQ</a>
        <a href="#contact">Contact</a>
      </div>
      <a href="#contact" className="btn">${content.primaryCta}</a>
    </nav>
  );
}`;

  const heroComponent = `import React from "react";

export function Hero() {
  return (
    <section className="hero container" id="top" aria-label="Hero Section">
      <div className="hero-grid">
        <div className="hero-text">
          <span className="eyebrow">${plan.theme}</span>
          <h1 className="hero-title">${content.heroTitle}</h1>
          <p className="hero-subtitle">${content.heroSubtitle}</p>
          <div className="hero-actions">
            <a href="#contact" className="btn">${content.primaryCta}</a>
            <a href="#features" className="btn btn-secondary">${content.secondaryCta}</a>
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img className="hero-image" src="${heroImage}" alt="${plan.siteName} Hero" loading="eager" />
        </div>
      </div>
    </section>
  );
}`;

  const featuresComponent = `import React from "react";

export function Features() {
  const sections = ${JSON.stringify(content.sections, null, 2)};
  return (
    <section className="content-section" id="features" aria-label="Features Section">
      <div className="container">
        {sections.map((section, idx) => (
          <div key={idx} style={{ marginBottom: "40px" }}>
            <span className="eyebrow">{section.title.toUpperCase()}</span>
            <h2 className="section-heading">{section.title}</h2>
            <p className="section-body">{section.body}</p>
            {section.items && (
              <div className="cards-grid">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="card">
                    <div className="badge">0{itemIdx + 1}</div>
                    <p className="item-title">{item}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}`;

  const testimonialsComponent = `import React from "react";

export function Testimonials() {
  const testimonials = ${JSON.stringify(content.testimonials, null, 2)};
  return (
    <section className="content-section" id="testimonials" aria-label="Client Testimonials">
      <div className="container">
        <span className="eyebrow">TESTIMONIALS</span>
        <h2 className="section-heading">Client Feedback</h2>
        <div className="quotes-grid">
          {testimonials.map((t, idx) => (
            <article key={idx} className="quote-card">
              <p className="quote-text">“{t.quote}”</p>
              <div className="quote-author">
                <strong>{t.name}</strong>
                <span>{t.role}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}`;

  const contactComponent = `import React, { useState } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="content-section" id="contact" aria-label="Contact Section">
      <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <span className="eyebrow">GET IN TOUCH</span>
        <h2 className="section-heading">Connect With Us</h2>
        {submitted ? (
          <div className="card" style={{ textAlign: "center", padding: "32px", color: "var(--primary)" }}>
            Thank you! Your message has been sent successfully.
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input type="text" id="name" required placeholder="Jane Doe" />
            </div>
            <div className="form-group">
              <label htmlFor="email">Your Email</label>
              <input type="email" id="email" required placeholder="jane@example.com" />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea id="message" rows={4} required placeholder="How can we help you?"></textarea>
            </div>
            <button className="btn" style={{ width: "100%" }} type="submit">Submit Request</button>
          </form>
        )}
      </div>
    </section>
  );
}`;

  const appComponent = `import React from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { Testimonials } from "./components/Testimonials";
import { ContactForm } from "./components/ContactForm";
import "./styles.css";

export default function App() {
  return (
    <div className="sitecraft-app">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Testimonials />
        <ContactForm />
      </main>
      <footer className="container footer" style={{ textAlign: "center", padding: "40px 0" }}>
        <p>© {new Date().getFullYear()} ${plan.siteName}. All rights reserved.</p>
      </footer>
    </div>
  );
}`;

  return [
    { path: "src/App.tsx", language: "tsx", content: appComponent },
    { path: "src/components/Navbar.tsx", language: "tsx", content: navbarComponent },
    { path: "src/components/Hero.tsx", language: "tsx", content: heroComponent },
    { path: "src/components/Features.tsx", language: "tsx", content: featuresComponent },
    { path: "src/components/Testimonials.tsx", language: "tsx", content: testimonialsComponent },
    { path: "src/components/ContactForm.tsx", language: "tsx", content: contactComponent },
    { path: "src/styles.css", language: "css", content: `:root { --primary: ${plan.colorPalette.primary}; --secondary: ${plan.colorPalette.secondary}; --background: ${plan.colorPalette.background}; --foreground: ${plan.colorPalette.foreground}; }\nbody { background: var(--background); color: var(--foreground); font-family: ${plan.fontFamily}; }` },
    { path: "src/main.tsx", language: "tsx", content: `import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);` },
    { path: "index.html", language: "html", content: html },
    { path: "package.json", language: "json", content: JSON.stringify({ name: plan.siteName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "generated-site", private: true, version: "0.1.0", type: "module", scripts: { dev: "vite", build: "tsc && vite build" }, dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" }, devDependencies: { vite: "^5.4.2", typescript: "^5.5.3", "@types/react": "^18.3.3", "@types/react-dom": "^18.3.0" } }, null, 2) },
    { path: "README.md", language: "md", content: `# ${plan.siteName}\n\nGenerated autonomously by SiteCraft AI.\n\nDesign Direction: ${design.layout}\n\n## Component Hierarchy\n- \`Navbar\`\n- \`Hero\`\n- \`Features\`\n- \`Testimonials\`\n- \`ContactForm\`\n\n## Local Development\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n` },
    { path: ".env.example", language: "bash", content: "# Add client-safe public values here.\n" }
  ];
}
