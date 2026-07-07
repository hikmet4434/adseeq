import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WinningHunter MVP",
  description: "Dropshipping reklam ve mağaza istihbaratı MVP"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
