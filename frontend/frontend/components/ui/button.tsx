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
    "bg-ink text-white shadow-sm hover:bg-black hover:shadow-md",

  accent:
    "bg-accent text-white shadow-sm hover:bg-[#cf4f38] hover:shadow-md",

  outline:
    "border border-ink/15 bg-white/80 text-ink shadow-sm hover:border-ink/25 hover:bg-white hover:shadow-md",

  ghost:
    "text-ink/75 hover:bg-black/[0.05] hover:text-ink",

  secondary:
    "bg-ink/[0.06] text-ink hover:bg-ink/[0.10] shadow-sm",

  danger:
    "bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md",
};

type Variant = keyof typeof variants;

/* =========================================================
   BUTTON SIZES
========================================================= */

const sizes = {
  sm: "h-8 min-w-8 rounded-md px-3 text-xs",
  md: "h-10 min-w-10 rounded-md px-4 text-sm",
  lg: "h-11 min-w-11 rounded-lg px-5 text-sm",
  xl: "h-12 min-w-12 rounded-lg px-6 text-base",
};

type Size = keyof typeof sizes;

/* =========================================================
   COMMON STYLES
========================================================= */

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold " +
  "transition-all duration-200 ease-out " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 " +
  "active:scale-[0.98]";

/* =========================================================
   LOADING SPINNER
========================================================= */

function Spinner({ size = "md" }: { size?: Size }) {
  const spinnerSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-4 w-4",
    xl: "h-5 w-5",
  };

  return (
    <span
      aria-hidden="true"
      className={`${spinnerSizes[size]} animate-spin rounded-full border-2 border-current border-t-transparent`}
    />
  );
}

/* =========================================================
   BUTTON
========================================================= */

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  loading = false,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size} />
          <span>{loadingText ?? "Loading..."}</span>
        </>
      ) : (
        children
      )}
    </button>
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
