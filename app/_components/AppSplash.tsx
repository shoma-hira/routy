"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const splashSessionKey = "routy-launch-animation-v1";
const minVisibleMs = 1450;
const maxVisibleMs = 1750;
const reducedMotionVisibleMs = 260;
const fadeOutMs = 350;

function isHomePath(pathname: string | null) {
  return pathname === "/home" || (pathname?.startsWith("/home/") ?? false);
}

export function AppSplash() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"hidden" | "visible" | "leaving">("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isHomePath(pathname)) return;
    if (window.sessionStorage.getItem(splashSessionKey) === "done") return;

    window.sessionStorage.setItem(splashSessionKey, "showing");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumVisibleMs = reduceMotion ? 0 : minVisibleMs;
    const maximumVisibleMs = reduceMotion ? reducedMotionVisibleMs : maxVisibleMs;
    let startedAt = performance.now();
    let closeTimer: number | undefined;
    let removeTimer: number | undefined;
    let isClosed = false;

    function closeSplash() {
      if (isClosed) return;
      isClosed = true;
      window.sessionStorage.setItem(splashSessionKey, "done");
      setPhase("leaving");
      removeTimer = window.setTimeout(() => {
        setPhase("hidden");
      }, fadeOutMs);
    }

    function closeAfterMinimumTime() {
      const elapsed = performance.now() - startedAt;
      closeTimer = window.setTimeout(closeSplash, Math.max(minimumVisibleMs - elapsed, 0));
    }

    const frameId = window.requestAnimationFrame(() => {
      startedAt = performance.now();
      setPhase("visible");
    });

    window.addEventListener("routy:app-ready", closeAfterMinimumTime, { once: true });
    const maxTimer = window.setTimeout(closeSplash, maximumVisibleMs);

    return () => {
      window.cancelAnimationFrame(frameId);
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
      window.removeEventListener("routy:app-ready", closeAfterMinimumTime);
      window.clearTimeout(maxTimer);
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
      <div className="routySplashMark" aria-hidden="true">
        <svg
          viewBox="0 0 512 512"
          className="h-36 w-36"
          focusable="false"
          aria-hidden="true"
          role="presentation"
        >
          <defs>
            <filter id="routyLaunchSoftShadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow
                dx="0"
                dy="8"
                stdDeviation="7"
                floodColor="#046B42"
                floodOpacity="0.26"
              />
            </filter>
          </defs>
          <path
            className="routySplashRoute"
            d="M356 365 C331 392 294 389 266 365 L236 338 L171 383 C151 397 136 386 136 362 L136 128 L158 128 L280 128 C330 128 358 159 354 205 C352 226 339 240 318 247 L251 258 C221 263 214 292 237 312 L356 365"
            fill="none"
            filter="url(#routyLaunchSoftShadow)"
            pathLength="100"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="36"
          />
          <circle
            className="routySplashPoint routySplashPointStart"
            cx="356"
            cy="365"
            r="28"
            fill="#00985D"
            stroke="#FFFFFF"
            strokeWidth="15"
          />
          <circle
            className="routySplashPoint routySplashPointTop"
            cx="158"
            cy="128"
            r="28"
            fill="#B8D300"
            stroke="#FFFFFF"
            strokeWidth="15"
          />
          <circle
            className="routySplashPoint routySplashPointMid"
            cx="318"
            cy="247"
            r="28"
            fill="#31C918"
            stroke="#FFFFFF"
            strokeWidth="15"
          />
        </svg>
        <p className="routySplashWord">ROUTY</p>
      </div>
    </div>
  );
}
