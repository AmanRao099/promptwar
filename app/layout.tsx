import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HavenAI — steady ground, one tap away",
  description:
    "A calm, low-touch companion for recovery from substance use disorder and for the people supporting them.",
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
