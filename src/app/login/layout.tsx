import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş",
  description: "AdSeeQ hesabınıza giriş yapın.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false, nocache: true }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
