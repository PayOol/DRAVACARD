import type { Metadata, Viewport } from "next";
import { Inter, Righteous } from "next/font/google";
import "./globals.css";
import "@/components/payment/payment-result-mobile.css";
import { withBasePath } from "@/lib/base-path";
import { DRAVA_CONTACT } from "@/lib/drava-contact";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "@/lib/theme-context";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import Script from "next/script";

// Fonts
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const righteous = Righteous({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-righteous",
});

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://drava.click",
);
siteUrl.pathname = `${siteUrl.pathname.replace(/\/$/, "")}/`;
const socialImageUrl = new URL("og-image.svg", siteUrl);
const logoUrl = new URL("images/drava-wordmark.svg", siteUrl);

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action https://pay.soleaspay.com",
  "script-src 'self' 'unsafe-inline'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://img.youtube.com",
  "font-src 'self' data:",
  "connect-src 'self' https://drava-leekpay.sebpay-proxy.workers.dev",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src https://www.youtube.com",
  "media-src 'none'",
].join("; ");

const structuredData = JSON.stringify([
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DRAVA",
    url: siteUrl.href,
    logo: logoUrl.href,
    email: "contact.drava@gmail.com",
    telephone: DRAVA_CONTACT.phoneNumber,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: DRAVA_CONTACT.phoneNumber,
      contactType: "customer support",
      areaServed: "CM",
      availableLanguage: ["French", "English"],
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DRAVA",
    url: siteUrl.href,
    inLanguage: ["fr", "en"],
    description:
      "Plateforme DRAVA de cartes virtuelles Visa et Mastercard et de packs de pièces TikTok au Cameroun.",
  },
]).replace(/</g, "\\u003c");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Carte virtuelle au Cameroun & pièces TikTok | DRAVA",
    template: "%s | DRAVA",
  },
  description:
    "Découvrez les cartes virtuelles Visa et Mastercard DRAVA au Cameroun, comparez les offres et accédez aussi aux packs de pièces TikTok.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  referrer: "strict-origin-when-cross-origin",
  manifest: withBasePath("/manifest.json"),
  applicationName: "Drava",
  appleWebApp: {
    capable: true,
    title: "Drava",
    statusBarStyle: "default",
  },
  other: { "apple-mobile-web-app-capable": "yes" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      {
        url: withBasePath("/favicon.svg"),
        type: "image/svg+xml",
        sizes: "any",
      },
      {
        url: withBasePath("/favicon-16x16.svg"),
        type: "image/svg+xml",
        sizes: "16x16",
      },
      {
        url: withBasePath("/favicon-32x32.svg"),
        type: "image/svg+xml",
        sizes: "32x32",
      },
    ],
    apple: [
      {
        url: withBasePath("/apple-touch-icon.png"),
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
  openGraph: {
    title: "Carte virtuelle au Cameroun & pièces TikTok | DRAVA",
    description:
      "Cartes virtuelles Visa et Mastercard DRAVA au Cameroun et packs de pièces TikTok.",
    url: siteUrl,
    siteName: "DRAVA",
    images: [
      {
        url: socialImageUrl,
        width: 1200,
        height: 630,
      },
    ],
    locale: "fr_CM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carte virtuelle au Cameroun & pièces TikTok | DRAVA",
    description:
      "Cartes virtuelles Visa et Mastercard DRAVA au Cameroun et packs de pièces TikTok.",
    images: [socialImageUrl],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={contentSecurityPolicy}
        />
        <Script
          id="drava-organization-website-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {structuredData}
        </Script>
        {/* This tiny same-origin script must apply the saved theme before first paint. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={withBasePath("/theme-init.js")} />
        {/* Capture the browser's one-use install event before React hydrates. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={withBasePath("/pwa-install-capture.js")} />
      </head>
      <body
        className={`${inter.variable} ${righteous.variable} font-sans min-h-screen antialiased bg-background text-foreground`}
      >
        <LanguageProvider>
          <ThemeProvider>
            {children}
            <WhatsAppButton />
            <PwaInstallPrompt />
          </ThemeProvider>
        </LanguageProvider>
        <Script
          src={withBasePath("/register-sw.js")}
          strategy="lazyOnload"
          data-enabled={process.env.NODE_ENV === "production" ? "true" : "false"}
        />
      </body>
    </html>
  );
}
