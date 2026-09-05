"use client";

import { motion, useIsPresent } from "framer-motion";
import {
  type ReactNode,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

export const screenEase = [0.22, 1, 0.36, 1] as const;

export function MobileScreenTransition({
  children,
  direction,
  detail,
  reducedMotion,
  onEnter,
  panelId,
  labelledBy,
}: {
  children: ReactNode;
  direction: number;
  detail: boolean;
  reducedMotion: boolean;
  onEnter: (element: HTMLDivElement) => void;
  panelId?: string;
  labelledBy?: string;
}) {
  const isPresent = useIsPresent();
  const elementRef = useRef<HTMLDivElement>(null);
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useLayoutEffect(() => {
    if (elementRef.current) elementRef.current.inert = !isPresent;
  }, [isPresent]);

  useLayoutEffect(() => {
    if (isPresent && elementRef.current) onEnterRef.current(elementRef.current);
  }, [isPresent]);

  return (
    <motion.div
      ref={elementRef}
      className={`app-screen ${detail ? "app-screen--detail" : ""}`}
      id={panelId}
      role={panelId ? "tabpanel" : undefined}
      aria-labelledby={labelledBy}
      tabIndex={panelId ? 0 : undefined}
      aria-hidden={!isPresent || undefined}
      custom={direction}
      initial="enter"
      animate="visible"
      exit="leave"
      variants={{
        enter: (travel: number) => ({
          opacity: reducedMotion ? 1 : 0,
          x: reducedMotion ? 0 : travel * 28,
        }),
        visible: {
          opacity: 1,
          x: 0,
          transition: {
            duration: reducedMotion ? 0 : 0.26,
            ease: screenEase,
          },
        },
        leave: (travel: number) => ({
          opacity: reducedMotion ? 1 : 0,
          x: reducedMotion ? 0 : travel * -14,
          transition: {
            duration: reducedMotion ? 0 : 0.22,
            ease: "easeIn",
          },
        }),
      }}
    >
      {children}
    </motion.div>
  );
}

export function MobileChromeTransition({
  children,
  placement,
  reducedMotion,
}: {
  children: ReactNode;
  placement: "header" | "purchase";
  reducedMotion: boolean;
}) {
  const isPresent = useIsPresent();
  const elementRef = useRef<HTMLDivElement>(null);
  const purchase = placement === "purchase";
  useLayoutEffect(() => {
    if (elementRef.current) elementRef.current.inert = !isPresent;
  }, [isPresent]);
  return (
    <motion.div
      ref={elementRef}
      className={purchase ? "app-purchase-bar" : "app-header-leading"}
      aria-hidden={!isPresent || undefined}
      style={{ pointerEvents: isPresent ? "auto" : "none" }}
      initial={{
        opacity: reducedMotion ? 1 : 0,
        y: !reducedMotion && purchase ? 18 : 0,
      }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: reducedMotion ? 1 : 0,
        y: !reducedMotion && purchase ? 18 : 0,
        transition: { duration: reducedMotion ? 0 : 0.12, delay: 0 },
      }}
      transition={{
        duration: reducedMotion ? 0 : purchase ? 0.24 : 0.12,
        delay: !reducedMotion && purchase ? 0.12 : 0,
        ease: screenEase,
      }}
    >
      {children}
    </motion.div>
  );
}

// Forward the element ref so popLayout can remove exiting cards from the grid
// while keeping their last position. Exiting cards cannot receive input.
export const CatalogCardTransition = forwardRef<
  HTMLElement,
  { children: ReactNode; className?: string; reducedMotion: boolean }
>(function CatalogCardTransition(
  { children, className = "app-catalog-card", reducedMotion },
  forwardedRef,
) {
  const isPresent = useIsPresent();
  const elementRef = useRef<HTMLElement>(null);
  useImperativeHandle(forwardedRef, () => elementRef.current as HTMLElement);
  useLayoutEffect(() => {
    if (elementRef.current) elementRef.current.inert = !isPresent;
  }, [isPresent]);

  return (
    <motion.section
      ref={elementRef}
      className={className}
      aria-hidden={!isPresent || undefined}
      layout={reducedMotion ? false : "position"}
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: reducedMotion ? 1 : 0,
        y: reducedMotion ? 0 : -8,
        transition: { duration: reducedMotion ? 0 : 0.14 },
      }}
      transition={{ duration: reducedMotion ? 0 : 0.24, ease: screenEase }}
    >
      {children}
    </motion.section>
  );
});
