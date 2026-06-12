import "./globals.css";
import "@/styles/customization.css";
import { Inter } from "next/font/google";
import { AppProviders } from "./providers";

const inter = Inter({ subsets: ["latin"] });

/** Applique light/dark avant le premier paint (évite flash + bouton thème inutile si le JS client plante). */
const themeInitScript = `(function(){try{var d=document.documentElement,b=document.body,toxic=['high-contrast','offline-mode','large-text','reduce-motion','compact-mode','sidebar-collapsed','notifications-enabled','notification-sound-enabled'];toxic.forEach(function(c){d.classList.remove(c);});['--jt-primary','--jt-accent','--primary-color','--accent-color'].forEach(function(v){d.style.removeProperty(v);});var s=localStorage.getItem('theme')||'dark';if(s==='system'){s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}d.classList.remove('light','dark');b.classList.remove('light','dark');d.classList.add(s);b.classList.add(s);if(s==='dark'){d.classList.add('dark');}else{d.classList.remove('dark');}var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute('content',s==='dark'?'#111827':'#ffffff');}}catch(e){}})();`;

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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
