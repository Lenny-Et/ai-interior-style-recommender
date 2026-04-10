import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
  src?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  verified?: boolean;
  className?: string;
}

const sizes = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };
const textSizes = { xs: "text-[10px]", sm: "text-xs", md: "text-sm", lg: "text-base", xl: "text-xl" };

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function hashColor(name?: string) {
  const colors = ["from-brand-600 to-violet-600","from-blue-600 to-cyan-500","from-emerald-600 to-teal-500","from-orange-600 to-amber-500","from-pink-600 to-rose-500"];
  if (!name) return colors[0];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function Avatar({ src, name, size = "md", verified, className }: AvatarProps) {
  const px = sizes[size];
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn("rounded-full overflow-hidden ring-2 ring-surface-border", textSizes[size])}
        style={{ width: px, height: px }}
      >
        {src ? (
          <Image src={src} alt={name ?? "avatar"} width={px} height={px} className="object-cover w-full h-full" />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center font-bold bg-gradient-to-br text-white", hashColor(name))}>
            {getInitials(name)}
          </div>
        )}
      </div>
      {verified && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-500 rounded-full border-2 border-surface flex items-center justify-center">
          <svg viewBox="0 0 12 12" className="w-2 h-2 fill-white"><path d="M2 6l3 3 5-5"/></svg>
        </span>
      )}
    </div>
  );
}
