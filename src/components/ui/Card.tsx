import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  glass?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, hover = true, glow = false, glass = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-surface-border shadow-card overflow-hidden",
        glass ? "bg-surface-card/70 backdrop-blur-xl" : "bg-surface-card",
        hover && "transition-all duration-300 hover:border-brand-600/40 hover:shadow-glow-sm hover:-translate-y-0.5",
        glow && "border-brand-600/30 shadow-glow-sm",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-6 py-4 border-b border-surface-border", className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-6 py-4 border-t border-surface-border bg-surface/30", className)}>{children}</div>;
}
