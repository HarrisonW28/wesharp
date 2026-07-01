import type { Metadata } from "next";
import { Geist_Mono, Sora } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

import { Providers } from "./providers";
import { publicSiteOrigin } from "@/lib/public-site-url";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteOrigin()),
  title: {
    default: "WeSharp",
    template: "WeSharp · %s",
  },
  description: "Commercial knife sharpening operations for hospitality teams.",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WeSharp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className="dark" suppressHydrationWarning>
      <body className={`${sora.variable} ${geistMono.variable} min-h-screen font-sans font-medium`}>
        <Providers>{children}</Providers>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
