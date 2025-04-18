"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/language-context";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language } = useLanguage();

  // Remove any extension-added classes during hydration and update the lang attribute
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";

    // Update the HTML lang attribute based on the selected language
    document.documentElement.lang = language;
  }, [language]);

  return (
    <body className="antialiased" suppressHydrationWarning>
      {children}
    </body>
  );
}
