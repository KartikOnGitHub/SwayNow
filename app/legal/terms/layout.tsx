import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules and agreements for using Sway.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
