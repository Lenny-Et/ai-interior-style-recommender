"use client";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  onIconRightClick?: () => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon: Icon, iconRight: IconRight, onIconRightClick, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full py-3 rounded-xl bg-surface border text-sm text-purple-100 placeholder-text-muted",
              "focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 transition-all duration-200",
              error ? "border-red-500/70" : "border-surface-border",
              Icon ? "pl-10 pr-4" : "px-4",
              IconRight ? "pr-10" : "",
              className
            )}
            {...props}
          />
          {IconRight && (
            <button
              type="button"
              onClick={onIconRightClick}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-400 transition-colors"
            >
              <IconRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
export default Input;
