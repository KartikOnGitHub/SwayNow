import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import InstallPrompt from "./components/InstallPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://swaynow.eu";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SwayNow — Find your people anywhere",
    template: "%s · SwayNow",
  },
  description:
      "SwayNow connects you with people nearby in real time. Post what you're doing, find someone to explore with, and meet new people in your city. Free, spontaneous, real.",
  keywords: [
    "SwayNow", "meet people nearby", "social meetup app", "find friends nearby",
    "spontaneous meetups", "local connections", "real-time social app",
    "meet people in Berlin", "travel friends", "expat social app Europe",
    "meet locals", "city social app", "find people nearby",
  ],
  authors: [{ name: "SwayNow", url: SITE_URL }],
  creator: "SwayNow",
  publisher: "SwayNow",
  applicationName: "SwayNow",
  category: "social networking",
  classification: "Social",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    siteName: "SwayNow",
    title: "SwayNow — Find your people anywhere",
    description:
        "Real-time, location-based meetups. Post what you're up to and connect with people nearby — for free.",
    url: SITE_URL,
    locale: "en_EU",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SwayNow — Find your people anywhere",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SwayNow — Find your people anywhere",
    description:
        "Real-time, location-based meetups. Post what you're up to and connect with people nearby.",
    images: ["/og-image.png"],
    creator: "@swaynow",
    site: "@swaynow",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  verification: {
    // 🔧 Add your Google Search Console verification code here
    // google: "your-google-verification-code",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

// Structured data — tells Google exactly what SwayNow is
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      "name": "SwayNow",
      "url": SITE_URL,
      "description": "Real-time location-based meetup app. Connect with people nearby spontaneously.",
      "applicationCategory": "SocialNetworkingApplication",
      "operatingSystem": "Any",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR",
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5",
        "ratingCount": "1",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      "name": "SwayNow",
      "url": SITE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/icon-512.png`,
      },
      "sameAs": [
        "https://instagram.com/swaynow",
        "https://twitter.com/swaynow",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      "url": SITE_URL,
      "name": "SwayNow",
      "description": "Find your people anywhere",
      "publisher": { "@id": `${SITE_URL}/#org` },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${SITE_URL}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
      <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
          suppressHydrationWarning
          className="min-h-full flex flex-col bg-[#0B0B0F] text-white"
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
      {children}
      <InstallPrompt />
      </body>
      </html>
  );
}