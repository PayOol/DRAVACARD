import type { Metadata } from 'next';
import { Inter, Righteous } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/language-context';

// Fonts
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const righteous = Righteous({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-righteous',
});

export const metadata: Metadata = {
  title: 'DRAVA - Paiements sans frontières',
  description: 'Créez, rechargez et gérez vos cartes virtuelles Visa/Mastercard. Effectuez des paiements partout dans le monde en toute sécurité.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  openGraph: {
    title: 'DRAVA - Paiements sans frontières',
    description: 'Créez, rechargez et gérez vos cartes virtuelles Visa/Mastercard. Effectuez des paiements partout dans le monde en toute sécurité.',
    url: 'https://same-g4vvsjoulmg-latest.netlify.app/',
    siteName: 'DRAVA',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DRAVA - Paiements sans frontières',
    description: 'Créez, rechargez et gérez vos cartes virtuelles Visa/Mastercard.',
    images: ['/og-image.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className={`${inter.variable} ${righteous.variable} font-sans min-h-screen antialiased bg-white`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
