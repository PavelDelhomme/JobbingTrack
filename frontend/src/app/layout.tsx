import "./globals.css";
import "@/styles/customization.css";
import Script from "next/script";
import { Inter } from "next/font/google";
import { AppProviders } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="JobbingTrack - Plateforme de gestion des candidatures"
        />
        <meta name="theme-color" content="#111827" />
        <link rel="icon" type="image/png" href="/brand/jobbingtrack-logo.png" />
        <link rel="apple-touch-icon" href="/brand/jobbingtrack-logo.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
