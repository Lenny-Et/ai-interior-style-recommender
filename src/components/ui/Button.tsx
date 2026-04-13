"use client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "brand" | "ghost" | "outline" | "destructive" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "brand", size = "md", loading, fullWidth, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60";

    const variants = {
      brand:       "bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-500 hover:to-brand-400 hover:shadow-glow active:scale-[0.98]",
      ghost:       "bg-transparent border border-surface-border text-purple-300 hover:border-brand-500 hover:text-brand-400 hover:bg-surface-hover",
      outline:     "bg-transparent border border-brand-500/50 text-brand-400 hover:bg-brand-600/10 hover:border-brand-400",
      destructive: "bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30 hover:border-red-400",
      gold:        "bg-gradient-to-r from-gold-600 to-gold-500 text-white hover:from-gold-500 hover:to-gold-400 hover:shadow-glow-gold",
    };

    const sizes = {
      sm: "text-xs px-3.5 py-2",
      md: "text-sm px-5 py-2.5",
      lg: "text-base px-7 py-3.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
export default Button;
