"use client";

import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { withBasePath } from "@/lib/base-path";
import { useLanguage } from "@/lib/language-context";
import { Globe } from "lucide-react";
import Link from "next/link";

const Header = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm dark:border-slate-700 dark:bg-[#111c2e]/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:h-20 md:px-6">
        <Link href="/" aria-label="DRAVA">
          <img
            src={withBasePath("/images/drava-logo-transparent.svg")}
            alt="DRAVA Logo"
            className="desktop-brand-logo h-24 w-auto"
          />
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex min-h-11 items-center gap-2"
            onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
            aria-label={
              language === "fr" ? "Switch to English" : "Passer en français"
            }
          >
            <Globe className="h-4 w-4" />
            {language.toUpperCase()}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
