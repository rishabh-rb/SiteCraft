
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";

/* =========================================================
   BUTTON VARIANTS
========================================================= */

const variants = {
  primary:
    "bg-ink text-white shadow-sm hover:bg-black hover:shadow-md active:scale-[0.98]",

  accent:
    "bg-accent text-white shadow-sm hover:bg-[#cf4f38] hover:shadow-md active:scale-[0.98]",

  outline:
    "border border-ink/15 bg-white/80 text-ink shadow-sm hover:border-ink/25 hover:bg-white hover:shadow-sm active:scale-[0.98]",

  ghost:
    "text-ink/75 hover:bg-black/[0.05] hover:text-ink active:scale-[0.98]",
};

type Variant = keyof typeof variants;

/* =========================================================
   BUTTON SIZES
========================================================= */

const sizes = {
  sm: "h-8 rounded-md px-3 text-xs",
  md: "h-10 rounded-md px-4 text-sm",
  lg: "h-11 rounded-lg px-5 text-sm",
  xl: "h-12 rounded-lg px-6 text-base",
};

type Size = keyof typeof sizes;

/* =========================================================
   COMMON STYLES
========================================================= */

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

/* =========================================================
   BUTTON
========================================================= */

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

/* =========================================================
   BUTTON LINK
========================================================= */

interface ButtonLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  variant?: Variant;
  size?: Size;
  href: string;
  children: ReactNode;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  href,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
```

### What improved

* **4 variants:** `primary`, `accent`, `outline`, `ghost`
* **4 sizes:** `sm`, `md`, `lg`, `xl`
* Better keyboard accessibility with `focus-visible:ring`
* Better hover/active animations
* Proper default `type="button"` so buttons don't accidentally submit forms
* `ButtonLink` remains compatible with your existing Next.js `<Link>`
* Better disabled styling
* Works nicely with icons:

  ```tsx
  <Button>
    <Send className="h-4 w-4" />
    Generate
  </Button>
  ```
* You can now easily use:

  ```tsx
  <Button variant="accent" size="lg">
    Generate Website
  </Button>
  