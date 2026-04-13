import { cn } from "@/lib/utils";

type BadgeVariant = "brand" | "gold" | "green" | "red" | "gray" | "blue" | "orange";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  brand:  "bg-brand-600/20 text-brand-400 border-brand-500/30",
  gold:   "bg-gold-500/20 text-gold-400 border-gold-500/30",
  green:  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  red:    "bg-red-500/20 text-red-400 border-red-500/30",
  gray:   "bg-white/5 text-purple-300 border-white/10",
  blue:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export default function Badge({ children, variant = "gray", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border", variantClasses[variant], className)}>
      {children}
    </span>
  );
}
