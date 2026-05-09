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
  "Japandi","Coastal","Farmhouse","Eclectic","Glam","Gothic",
];

export const ROOM_TYPES = [
  "Living Room","Bedroom","Kitchen","Dining Room","Bathroom",
  "Home Office","Kids Room","Outdoor","Hallway","Basement",
];

export const BUDGET_RANGES = [
  "Under $500","$500–$1,000","$1,000–$2,500","$2,500–$5,000",
  "$5,000–$10,000","$10,000+",
];

export const CURATED_COLORS = [
  // Warm Woods & Beiges
  '#F5E6D3', '#E8D5C4', '#D4B896', '#C4A882', '#E0D8C8', '#F5F0E8',
  // Muted Greens & Emeralds
  '#B8D4CF', '#8FBFBB', '#5A9E98', '#2D6E68', '#1A433F', '#0F3D2C',
  // Slate & Luxury Blues
  '#E4E8F0', '#B8C4D8', '#8A9BB8', '#4A5E7A', '#1E2D42',
  // Browns & Warm Taupes
  '#E8E0D5', '#C8BFB0', '#A09080', '#6B5E52',
  // Stone & Cool Grays
  '#F0EBE3', '#DEDAD3', '#C5C0B8', '#9B9590',
  // Premium Vibrant & Deep Accents (Bohemian, Gothic, Mid-Century, Glam highlights)
  '#5C1D24', // Deep Burgundy / Crimson
  '#C96F53', // Warm Terracotta / Rust
  '#E5A93B', // Mustard / Ochre
  '#802B5C', // Deep Plum / Blackberry
  // Base Monochrome
  '#1A1A1A', // Charcoal Black
  '#FFFFFF', // Pure White
];
