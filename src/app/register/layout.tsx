import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ücretsiz Hesap Oluştur",
  description: "AdSeeQ ücretsiz hesabınızı oluşturun ve reklam araştırmasına başlayın.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: false, nocache: true }
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
