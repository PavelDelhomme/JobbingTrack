import "./globals.css";
import "@/styles/customization.css";
import Script from "next/script";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { AppProviders } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "JobbingTrack",
    template: "%s | JobbingTrack",
  },
  description: "JobbingTrack - Plateforme de gestion des candidatures",
  icons: {
    icon: "/brand/jobbingtrack-logo.png",
    apple: "/brand/jobbingtrack-logo.png",
  },
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
