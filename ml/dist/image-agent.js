"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImages = generateImages;
const CURATED_TOPIC_IMAGES = {
    restaurant: [
        {
            kind: "hero",
            description: "Artisanal culinary dining atmosphere",
            alt: "Exquisite gourmet dish served in a modern ambient restaurant",
            url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80"
        },
        {
            kind: "feature-1",
            description: "Fresh handcrafted ingredients",
            alt: "Organic farm-fresh ingredients being prepared by chefs",
            url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
        },
        {
            kind: "feature-2",
            description: "Handcrafted signature cocktails",
            alt: "Craft cocktail with rosemary garnish on marble bar",
            url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80"
        },
        {
            kind: "about",
            description: "Head chef culinary team",
            alt: "Chef delicately plating a gourmet dinner course",
            url: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=800&q=80"
        }
    ],
    tech: [
        {
            kind: "hero",
            description: "Modern developer engineering workspace",
            alt: "Clean minimalist workstation with high-resolution code display",
            url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80"
        },
        {
            kind: "feature-1",
            description: "Cloud infrastructure and AI analytics",
            alt: "Modern data network visualization and engineering interface",
            url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
        },
        {
            kind: "feature-2",
            description: "Agile product development team",
            alt: "Engineers collaborating on architectural system diagrams",
            url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
        },
        {
            kind: "about",
            description: "Software architecture and design",
            alt: "Developer writing TypeScript in a dark-mode IDE",
            url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80"
        }
    ],
    portfolio: [
        {
            kind: "hero",
            description: "Creative designer and developer portfolio",
            alt: "Creative professional working in an architecturally lit studio",
            url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1400&q=80"
        },
        {
            kind: "feature-1",
            description: "User experience & mobile interface",
            alt: "Mobile application interface prototype sketches and designs",
            url: "https://images.unsplash.com/photo-1581291518655-9523c93269c3?auto=format&fit=crop&w=800&q=80"
        },
        {
            kind: "feature-2",
            description: "Full-stack web application development",
            alt: "Modern laptop showcasing responsive web application",
            url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
        },
        {
            kind: "about",
            description: "Engineering leadership & crafts",
            alt: "Portrait of software engineer in studio lighting",
            url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80"
        }
    ],
    saas: [
        {
            kind: "hero",
            description: "Modern cloud software platform interface",
            alt: "Modern SaaS analytics dashboard on glass desk",
            url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80"
        },
        {
            kind: "feature-1",
            description: "Automated workflow orchestration",
            alt: "Team reviewing real-time automated performance charts",
            url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80"
        },
        {
            kind: "feature-2",
            description: "Enterprise security & compliance",
            alt: "Security shield and encrypted server room",
            url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80"
        },
        {
            kind: "about",
            description: "Global team collaboration",
            alt: "Diverse team celebrating product milestone in tech office",
            url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
        }
    ],
    default: [
        {
            kind: "hero",
            description: "Inspiring modern design aesthetic",
            alt: "Contemporary architectural interior with natural sunlight",
            url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80"
        },
        {
            kind: "feature-1",
            description: "Modern product craftsmanship",
            alt: "Carefully designed product details and materials",
            url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80"
        },
        {
            kind: "feature-2",
            description: "Innovative customer experience",
            alt: "Smiling customer engaging with personalized digital service",
            url: "https://images.unsplash.com/photo-1556742049-0a67e5572293?auto=format&fit=crop&w=800&q=80"
        },
        {
            kind: "about",
            description: "Mission and vision",
            alt: "Modern collaborative workshop space",
            url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80"
        }
    ]
};
function detectCategory(prompt, plan) {
    const combined = `${prompt} ${plan.siteName} ${plan.siteDescription} ${plan.theme}`.toLowerCase();
    if (combined.includes("restaurant") || combined.includes("cafe") || combined.includes("food") || combined.includes("dining") || combined.includes("bakery") || combined.includes("coffee")) {
        return "restaurant";
    }
    if (combined.includes("portfolio") || combined.includes("resume") || combined.includes("developer") || combined.includes("designer") || combined.includes("personal")) {
        return "portfolio";
    }
    if (combined.includes("saas") || combined.includes("software") || combined.includes("platform") || combined.includes("cloud") || combined.includes("app") || combined.includes("startup")) {
        return "saas";
    }
    if (combined.includes("tech") || combined.includes("code") || combined.includes("ai") || combined.includes("security") || combined.includes("engineer")) {
        return "tech";
    }
    return "default";
}
async function generateImages(prompt, plan, accessKey) {
    const category = detectCategory(prompt, plan);
    const fallbackAssets = CURATED_TOPIC_IMAGES[category] || CURATED_TOPIC_IMAGES.default;
    if (!accessKey) {
        return fallbackAssets;
    }
    try {
        const query = encodeURIComponent(`${plan.siteName} ${category}`);
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=4&orientation=landscape`, {
            headers: {
                Authorization: `Client-ID ${accessKey}`
            }
        });
        if (!response.ok) {
            console.warn(`Unsplash API returned status ${response.status}, using curated fallback images.`);
            return fallbackAssets;
        }
        const data = (await response.json());
        if (!data.results || data.results.length === 0) {
            return fallbackAssets;
        }
        const kinds = ["hero", "feature-1", "feature-2", "about"];
        return data.results.slice(0, 4).map((item, idx) => ({
            kind: kinds[idx] || `asset-${idx + 1}`,
            description: item.description || item.alt_description || `${plan.siteName} visual`,
            alt: item.alt_description || item.description || `${plan.siteName} illustration`,
            url: item.urls?.regular || fallbackAssets[idx]?.url || fallbackAssets[0].url
        }));
    }
    catch (error) {
        console.warn("Unsplash API fetch failed, falling back to curated assets:", error);
        return fallbackAssets;
    }
}
