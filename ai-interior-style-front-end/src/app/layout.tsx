import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ThemeSync from "@/components/ThemeSync";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Homitify – AI-Powered Interior Design", template: "%s | Homitify" },
  description: "Get personalized AI interior design recommendations, hire professional designers, and transform your space with Homitify.",
  keywords: ["interior design", "AI design", "room recommendations", "home decor", "professional designers"],
  authors: [{ name: "Homitify" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Homitify",
    title: "Homitify – AI-Powered Interior Design",
    description: "Transform your space with personalized AI interior design recommendations.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="noise antialiased">
        <ThemeSync />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "var(--toast-bg)", border: "1px solid var(--toast-border)", color: "var(--toast-text)", borderRadius: "12px" },
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
