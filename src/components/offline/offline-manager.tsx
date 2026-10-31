"use client";

import React from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/supabase/config";
import { clearOfflinePages } from "@/lib/offline";

function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getOfflineSnapshot() {
  return !navigator.onLine;
}

function getServerOfflineSnapshot() {
  return false;
}

export function OfflineManager() {
  const offline = React.useSyncExternalStore(
    subscribeToConnectivity,
    getOfflineSnapshot,
    getServerOfflineSnapshot,
  );

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (!isConfigured()) return;

    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          void clearOfflinePages();
        }
      });
      subscription = data.subscription;
    } catch {
      return;
    }

    return () => subscription?.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!offline) return;

    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const anchor =
        target instanceof Element
          ? (target.closest("a[href]") as HTMLAnchorElement | null)
          : null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      event.preventDefault();
      window.location.assign(url.href);
    }

    function handleSubmit(event: SubmitEvent) {
      event.preventDefault();
      event.stopPropagation();
      toast.error("You're offline", {
        description: "Changes can't be saved until you reconnect.",
      });
    }

    function handlePopState() {
      window.location.reload();
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [offline]);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-50 flex items-center justify-center gap-2 border-b border-amber/30 bg-amber-soft px-4 py-2 text-[13px] font-medium text-amber"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Offline - showing saved pages. Changes are disabled.</span>
    </div>
  );
}
