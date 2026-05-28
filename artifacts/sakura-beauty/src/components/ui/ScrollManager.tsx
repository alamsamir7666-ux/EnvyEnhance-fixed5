import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const SCROLL_KEY = (path: string) => `__scroll__${path}`;

export function ScrollManager() {
  const [location] = useLocation();
  const lastScrollYRef = useRef(0);
  const isPopRef = useRef(false);
  const locationRef = useRef(location);

  // Track scrollY continuously
  useEffect(() => {
    const onScroll = () => { lastScrollYRef.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mark back/forward before wouter fires
  useEffect(() => {
    window.history.scrollRestoration = "manual";
    const onPop = () => {
      // Save current position before leaving
      sessionStorage.setItem(SCROLL_KEY(locationRef.current), String(Math.round(lastScrollYRef.current)));
      isPopRef.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // On route change
  useEffect(() => {
    locationRef.current = location;

    if (isPopRef.current) {
      isPopRef.current = false;
      const saved = sessionStorage.getItem(SCROLL_KEY(location));
      const targetY = saved ? parseInt(saved, 10) : 0;
      console.log("[scroll] restoring", location, "to", targetY);

      if (targetY <= 0) {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        return;
      }

      let attempts = 0;
      function tryScroll() {
        if (document.body.scrollHeight - window.innerHeight >= targetY || attempts >= 50) {
          window.scrollTo({ top: targetY, behavior: "instant" as ScrollBehavior });
        } else {
          attempts++;
          setTimeout(tryScroll, 100);
        }
      }
      requestAnimationFrame(tryScroll);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [location]);

  return null;
}
