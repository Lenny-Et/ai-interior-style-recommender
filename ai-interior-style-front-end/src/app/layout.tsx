import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Homitify Interiors – AI-Powered Interior Design", template: "%s | Homitify Interiors" },
  description: "Get personalized AI interior design recommendations, hire professional designers, and transform your space with Homitify Interiors.",
  keywords: ["interior design", "AI design", "room recommendations", "home decor", "professional designers"],
  authors: [{ name: "Homitify Interiors" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Homitify Interiors",
    title: "Homitify Interiors – AI-Powered Interior Design",
    description: "Transform your space with personalized AI interior design recommendations.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} dark`} suppressHydrationWarning>
      <body className="noise antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#1a1028", border: "1px solid #2d1f42", color: "#f3e8ff", borderRadius: "12px" },
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
