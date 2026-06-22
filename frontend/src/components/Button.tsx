import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
};

const variants = {
  primary: "bg-leaf text-white shadow-glow hover:bg-moss",
  secondary: "border border-line bg-paper text-ink hover:border-leaf hover:bg-white",
  ghost: "text-ink hover:bg-white/80",
  danger: "bg-ember text-white hover:bg-red-700"
};

export function Button({ className = "", variant = "primary", icon, children, ...props }: Props) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-sm font-extrabold transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
