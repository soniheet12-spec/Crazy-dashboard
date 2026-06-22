"use client";

import { useEffect } from "react";

/** Registers the service worker so the app is installable / offline-capable. */
export function Pwa() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration failures */
    });
  }, []);
  return null;
}
