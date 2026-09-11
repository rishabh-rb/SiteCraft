import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

const variants = {
  primary: "bg-ink text-white hover:bg-black",
  accent: "bg-accent text-white hover:bg-[#cf4f38]",
  outline: "border border-ink/15 bg-white/70 text-ink hover:bg-white",
  ghost: "text-ink hover:bg-black/5"
};

type Variant = keyof typeof variants;

const base =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; href: string; children: ReactNode }) {
  return (
    <Link className={`${base} ${variants[variant]} ${className}`} href={href} {...props}>
      {children}
    </Link>
  );
}
