import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ETB") {
  return new Intl.NumberFormat("en-ET", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));
}

export function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function truncate(str: string, length = 80) {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

export function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

export const STYLE_TAGS = [
  "Modern","Minimalist","Scandinavian","Industrial","Bohemian",
  "Mid-Century","Traditional","Rustic","Contemporary","Art Deco",
  "Japandi","Coastal","Farmhouse","Eclectic","Glam",
];

export const ROOM_TYPES = [
  "Living Room","Bedroom","Kitchen","Dining Room","Bathroom",
  "Home Office","Kids Room","Outdoor","Hallway","Basement",
];

export const BUDGET_RANGES = [
  "Under $500","$500–$1,000","$1,000–$2,500","$2,500–$5,000",
  "$5,000–$10,000","$10,000+",
];
