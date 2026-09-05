"use client";

import { motion, useIsPresent } from "framer-motion";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import type { CatalogSection } from "@/lib/catalog-section";

export default function CatalogSectionPanel({
  children,
  section,
  reducedMotion,
}: {
  children: ReactNode;
  section: CatalogSection;
  reducedMotion: boolean;
}) {
  const isPresent = useIsPresent();
  const panelRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (panelRef.current) panelRef.current.inert = !isPresent;
  }, [isPresent]);

  return (
    <motion.div
      ref={panelRef}
      className="catalog-section-panel"
      id={`desktop-section-${section}`}
      role="tabpanel"
      aria-labelledby={`desktop-tab-${section}`}
      aria-hidden={!isPresent || undefined}
      tabIndex={0}
      initial={{ opacity: reducedMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: reducedMotion ? 1 : 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
    >
      {children}
    </motion.div>
  );
}
