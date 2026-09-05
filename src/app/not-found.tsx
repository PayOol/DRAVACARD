"use client";

import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import Link from "next/link";

export default function NotFound() {
  const { language } = useLanguage();
  const fr = language === "fr";
  return (
    <MainLayout>
      <section className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        <p className="text-5xl font-bold text-blue-600 dark:text-blue-300">
          404
        </p>
        <h1 className="text-2xl font-bold">
          {fr ? "Page introuvable" : "Page not found"}
        </h1>
        <p className="text-muted-foreground">
          {fr
            ? "Cette page n’existe pas ou a été déplacée."
            : "This page does not exist or has moved."}
        </p>
        <Button asChild className="min-h-11">
          <Link href="/">{fr ? "Retour à l’accueil" : "Back to home"}</Link>
        </Button>
      </section>
    </MainLayout>
  );
}
