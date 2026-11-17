import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noor — A little light, every day",
  description: "A calm Islamic digital companion for dhikr, Quran reading, learning, and thoughtful study.",
  applicationName: "Noor",
  themeColor: "#f7f5f0",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
