import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/app/components/InstallPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://swaynow.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SwayNow — Find your people anywhere",
    template: "%s · SwayNow",
  },
  description:
      "SwayNow connects you with people nearby in real time. Post what you're up to, find someone to explore with, and meet new people in your city.",
  keywords: [
    "SwayNow", "meet people", "nearby", "social app", "find friends",
    "explore together", "real-time meetups", "city social", "make friends",
    "spontaneous meetups", "travel friends", "local connections",
  ],
  authors: [{ name: "SwayNow" }],
  creator: "SwayNow",
  publisher: "SwayNow",
  applicationName: "SwayNow",
  category: "social",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SwayNow",
    title: "SwayNow — Find your people anywhere",
    description: "Real-time, location-based meetups. Post what you're up to and connect with people nearby.",
    url: SITE_URL,
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "SwayNow — Find your people anywhere" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SwayNow — Find your people anywhere",
    description: "Real-time, location-based meetups. Post what you're up to and connect with people nearby.",
    images: ["/og-image.png"],
    creator: "@swaynow",
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
      <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#0B0B0F] text-white" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {children}
      <InstallPrompt />
      </body>
      </html>
  );
}