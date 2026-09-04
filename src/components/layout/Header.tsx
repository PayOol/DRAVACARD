"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { withBasePath } from "@/lib/base-path";
import { useLanguage } from "@/lib/language-context";
import { ChevronDown, Globe, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/">
            <img
              src={withBasePath("/images/drava-logo-transparent.svg")}
              alt="DRAVA Logo"
              className="h-24 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/" className={navigationMenuTriggerStyle()}>
                      {t("navigation.home")}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/cards"
                      className={navigationMenuTriggerStyle()}
                    >
                      {t("navigation.cards")}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>
                    {language === "fr" ? "Services" : "Services"}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/topup"
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">
                              {t("navigation.topup")}
                            </div>
                            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                              {language === "fr"
                                ? "Service temporairement indisponible"
                                : "Service temporarily unavailable"}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/balance"
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">
                              {t("navigation.balance")}
                            </div>
                            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                              {language === "fr"
                                ? "Consultation temporairement indisponible"
                                : "Lookup temporarily unavailable"}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/withdrawal"
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">
                              {t("navigation.withdrawal")}
                            </div>
                            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                              {language === "fr"
                                ? "Service temporairement indisponible"
                                : "Service temporarily unavailable"}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/reseller"
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">
                              {language === "fr"
                                ? "Informations revendeurs"
                                : "Reseller information"}
                            </div>
                            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                              {language === "fr"
                                ? "Candidatures temporairement suspendues"
                                : "Applications temporarily paused"}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/about-us"
                      className={navigationMenuTriggerStyle()}
                    >
                      {t("navigation.aboutUs")}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Action buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Globe className="h-4 w-4" />
                  <span>{language.toUpperCase()}</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage("fr")}>
                  {t("common.french")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")}>
                  {t("common.english")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden py-4 px-4 space-y-4 bg-white border-t border-gray-100">
          <nav className="flex flex-col space-y-4">
            <Link href="/" className="text-gray-800 hover:text-blue-600">
              {t("navigation.home")}
            </Link>
            <Link href="/cards" className="text-gray-800 hover:text-blue-600">
              {t("navigation.cards")}
            </Link>
            <Link href="/topup" className="text-gray-800 hover:text-blue-600">
              {t("navigation.topup")}
            </Link>
            <Link href="/balance" className="text-gray-800 hover:text-blue-600">
              {t("navigation.balance")}
            </Link>
            <Link
              href="/withdrawal"
              className="text-gray-800 hover:text-blue-600"
            >
              {t("navigation.withdrawal")}
            </Link>
            <Link
              href="/reseller"
              className="text-gray-800 hover:text-blue-600"
            >
              {language === "fr"
                ? "Informations revendeurs"
                : "Reseller information"}
            </Link>
            <Link
              href="/about-us"
              className="text-gray-800 hover:text-blue-600"
            >
              {t("navigation.aboutUs")}
            </Link>
          </nav>

          <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="justify-center"
              onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
            >
              <Globe className="h-4 w-4 mr-2" />
              {language === "fr" ? "Switch to English" : "Passer en Français"}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
