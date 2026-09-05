"use client";

import DravaLogo from "@/components/layout/DravaLogo";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useLanguage } from "@/lib/language-context";
import { ArrowLeft, Globe } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import "./mobile-layout.css";

interface MainLayoutProps {
  children: ReactNode;
  mobileContent?: ReactNode;
}

export default function MainLayout({
  children,
  mobileContent,
}: MainLayoutProps) {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="app-layout flex min-h-screen flex-col">
      <div className="app-desktop-header hidden md:block">
        <Header />
      </div>
      {!mobileContent && (
        <header className="app-page-header md:hidden">
          <Link
            className="app-icon-button"
            href="/"
            aria-label={
              language === "fr" ? "Retour au catalogue" : "Back to catalogue"
            }
          >
            <ArrowLeft aria-hidden="true" size={22} />
          </Link>
          <DravaLogo />
          <div className="app-header-actions flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <button
              className="app-language"
              type="button"
              onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
              aria-label={
                language === "fr" ? "Switch to English" : "Passer en français"
              }
            >
              <Globe aria-hidden="true" size={16} />
              {language.toUpperCase()}
            </button>
          </div>
        </header>
      )}
      <main className="app-main flex-grow md:pt-20">
        {mobileContent ? (
          <>
            <div className="app-desktop-content hidden md:block">
              {children}
            </div>
            <div className="app-mobile-content md:hidden">{mobileContent}</div>
          </>
        ) : (
          children
        )}
      </main>
      <div className="app-desktop-footer hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
