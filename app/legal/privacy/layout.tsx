import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SwayNow collects, uses, and protects your personal data. GDPR compliant.",
  alternates: { canonical: "https://swaynow.eu/legal/privacy" },
  robots: { index: true, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}