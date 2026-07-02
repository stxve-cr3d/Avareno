import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
};

const variants = {
  primary: "av-btn-primary",
  secondary: "av-btn-secondary",
  ghost: "av-btn-ghost",
  danger: "av-btn-danger"
};

export function Button({ className = "", variant = "primary", icon, children, ...props }: Props) {
  return (
    <button
      className={`av-btn ${variants[variant]} min-h-11 text-sm ${className}`.trim()}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
