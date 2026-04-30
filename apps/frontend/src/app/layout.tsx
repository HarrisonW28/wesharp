import type { Metadata } from "next";
import { Geist_Mono, Sora } from "next/font/google";

import "./globals.css";

import { Providers } from "./providers";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "WeSharp",
    template: "%s · WeSharp",
  },
  description: "Commercial knife sharpening operations for hospitality teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className={`${sora.variable} ${geistMono.variable} min-h-screen font-sans font-medium`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
