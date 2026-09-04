"use client";

import MainLayout from "@/components/layout/MainLayout";
import CtaSection from "@/components/sections/CtaSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import HeroSection from "@/components/sections/HeroSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import { useLanguage } from "@/lib/language-context";

export default function Home() {
  const { language } = useLanguage();

  return (
    <MainLayout>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CtaSection />
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {language === "fr" ? (
              <>
                Une présentation publique de{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
                  DRAVA
                </span>
              </>
            ) : (
              <>
                A public overview of{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
                  DRAVA
                </span>
              </>
            )}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8">
            {language === "fr"
              ? "Les services transactionnels sont temporairement indisponibles pendant leur migration vers une infrastructure sécurisée."
              : "Transactional services are temporarily unavailable while they are migrated to secure infrastructure."}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
