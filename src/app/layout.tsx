import type { Metadata } from "next";
import { Inter, Righteous } from "next/font/google";
import "./globals.css";
import { withBasePath } from "@/lib/base-path";
import { LanguageProvider } from "@/lib/language-context";
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

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'none'",
  "script-src 'self' 'unsafe-inline'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "media-src 'none'",
].join("; ");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "DRAVA - Site public d'information",
  description:
    "Site public d'information DRAVA. Services de carte, paiement, recharge et retrait temporairement indisponibles.",
  referrer: "strict-origin-when-cross-origin",
  manifest: withBasePath("/manifest.json"),
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
        url: withBasePath("/apple-touch-icon.svg"),
        type: "image/svg+xml",
        sizes: "180x180",
      },
    ],
  },
  openGraph: {
    title: "DRAVA - Site public d'information",
    description:
      "Site public d'information DRAVA. Services de carte, paiement, recharge et retrait temporairement indisponibles.",
    url: siteUrl,
    siteName: "DRAVA",
    images: [
      {
        url: socialImageUrl,
        width: 1200,
        height: 630,
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DRAVA - Site public d'information",
    description:
      "Présentation publique de DRAVA; services transactionnels temporairement indisponibles.",
    images: [socialImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={contentSecurityPolicy}
        />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body
        className={`${inter.variable} ${righteous.variable} font-sans min-h-screen antialiased bg-white`}
      >
        <LanguageProvider>{children}</LanguageProvider>
        <Script src={withBasePath("/register-sw.js")} strategy="lazyOnload" />
      </body>
    </html>
  );
}
