import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  external?: boolean;
  className?: string;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-accent-blue to-accent-purple text-white shadow-lg shadow-accent-blue/20 hover:opacity-90",
  secondary: "border border-border bg-surface-elevated text-foreground hover:border-accent-blue/40 hover:bg-surface",
  ghost: "text-muted hover:text-foreground hover:bg-surface-elevated",
};

export function Button({ href, children, variant = "primary", external = false, className = "" }: ButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${variants[variant]} ${className}`;
  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>{children}</a>;
  }
  return <Link href={href} className={classes}>{children}</Link>;
}
