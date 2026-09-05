"use client";

import type { CatalogSection } from "@/lib/catalog-section";
import { type TouchEvent, useCallback, useRef } from "react";

export type SwipeDirection = "left" | "right";

export interface SwipeCoordinates {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  elapsed?: number;
}

export const SWIPE_MIN_DISTANCE = 50;
export const SWIPE_MAX_ELAPSED_MS = 1000;
export const SWIPE_AXIS_RATIO = 1.3;

export function resolveSwipeDirection(
  coords: SwipeCoordinates,
): SwipeDirection | null {
  if (coords.elapsed !== undefined && coords.elapsed > SWIPE_MAX_ELAPSED_MS) {
    return null;
  }
  const deltaX = coords.endX - coords.startX;
  const deltaY = coords.endY - coords.startY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < SWIPE_MIN_DISTANCE) {
    return null;
  }
  if (absX <= absY * SWIPE_AXIS_RATIO) {
    return null;
  }
  return deltaX < 0 ? "left" : "right";
}

export function getNextSectionOnSwipe(
  current: CatalogSection,
  direction: SwipeDirection,
): CatalogSection | null {
  if (direction === "left" && current === "cards") {
    return "tiktok";
  }
  if (direction === "right" && current === "tiktok") {
    return "cards";
  }
  return null;
}

export interface UseSwipeTabsOptions {
  section: CatalogSection;
  onSectionChange: (section: CatalogSection) => void;
  disabled?: boolean;
}

export function useSwipeTabs({
  section,
  onSectionChange,
  disabled = false,
}: UseSwipeTabsOptions) {
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest("header, input, textarea, select, [data-no-swipe]") ||
          target.isContentEditable)
      ) {
        startRef.current = null;
        return;
      }
      const touch = e.touches[0];
      startRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    },
    [disabled],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (disabled || !startRef.current || e.changedTouches.length !== 1) {
        startRef.current = null;
        return;
      }
      const touch = e.changedTouches[0];
      const direction = resolveSwipeDirection({
        startX: startRef.current.x,
        startY: startRef.current.y,
        endX: touch.clientX,
        endY: touch.clientY,
        elapsed: Date.now() - startRef.current.time,
      });
      startRef.current = null;

      if (!direction) return;
      const next = getNextSectionOnSwipe(section, direction);
      if (next && next !== section) {
        onSectionChange(next);
      }
    },
    [disabled, onSectionChange, section],
  );

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
  };
}
