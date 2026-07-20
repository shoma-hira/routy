"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const splashSessionKey = "routy-launch-animation-v2";
const iconSrc = "/icons/icon-maskable-512x512.png";
const minVisibleMs = 300;
const maxHiddenMs = 1100;
const reducedMotionMaxHiddenMs = 280;
const fadeOutMs = 180;

function isHomePath(pathname: string | null) {
  return pathname === "/home" || (pathname?.startsWith("/home/") ?? false);
}

function readSplashDone() {
  try {
    return window.sessionStorage.getItem(splashSessionKey) === "done";
  } catch {
    return false;
  }
}

function writeSplashDone() {
  try {
    window.sessionStorage.setItem(splashSessionKey, "done");
  } catch {
    // Storage can be unavailable in private or restricted contexts.
  }
}

export function AppSplash() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"hidden" | "visible" | "leaving">("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isHomePath(pathname)) return;
    if (readSplashDone()) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumVisibleMs = reduceMotion ? 0 : minVisibleMs;
    const maximumHiddenMs = reduceMotion ? reducedMotionMaxHiddenMs : maxHiddenMs;
    const forceHideDelayMs = Math.max(maximumHiddenMs - fadeOutMs, 0);
    let startedAt = performance.now();
    let closeTimer: number | undefined;
    let removeTimer: number | undefined;
    let isClosed = false;

    function hideSplash() {
      if (isClosed) return;
      isClosed = true;
      writeSplashDone();
      setPhase("leaving");
      removeTimer = window.setTimeout(() => {
        setPhase("hidden");
      }, fadeOutMs);
    }

    function closeAfterMinimumTime() {
      const elapsed = performance.now() - startedAt;
      closeTimer = window.setTimeout(hideSplash, Math.max(minimumVisibleMs - elapsed, 0));
    }

    const frameId = window.requestAnimationFrame(() => {
      startedAt = performance.now();
      setPhase("visible");
    });

    window.addEventListener("routy:app-ready", closeAfterMinimumTime, { once: true });
    const forceTimer = window.setTimeout(hideSplash, forceHideDelayMs);

    return () => {
      window.cancelAnimationFrame(frameId);
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
      window.removeEventListener("routy:app-ready", closeAfterMinimumTime);
      window.clearTimeout(forceTimer);
    };
  }, [pathname]);

  useEffect(() => {
    if (phase === "hidden" || typeof window === "undefined") return;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousDocumentOverscrollBehavior = documentElement.style.overscrollBehavior;

    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "none";
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overflow = previousDocumentOverflow;
      documentElement.style.overscrollBehavior = previousDocumentOverscrollBehavior;
    };
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`routySplash fixed inset-0 z-[60] flex touch-none select-none items-center justify-center ${
        phase === "leaving" ? "routySplashLeaving" : ""
      }`}
      aria-hidden="true"
      role="presentation"
    >
      <Image
        src={iconSrc}
        alt=""
        aria-hidden="true"
        width={144}
        height={144}
        priority
        unoptimized
        className="routySplashIcon h-36 w-36 object-contain"
        draggable={false}
      />
    </div>
  );
}
