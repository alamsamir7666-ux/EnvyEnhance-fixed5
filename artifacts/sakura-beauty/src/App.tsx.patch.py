with open('artifacts/sakura-beauty/src/App.tsx', 'r') as f:
    c = f.read()

# Fix 1: track scrollY in ref so cleanup saves correct value
old1 = '''  // Save scroll on every scroll event + pagehide (covers bfcache)
  useEffect(() => {
    const save = () => saveScrollPosition(fullHref);
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      saveScrollPosition(fullHref); // flush on unmount / route change
      window.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", save);
    };
  }, [fullHref]);'''

new1 = '''  // Save scroll on every scroll event + pagehide (covers bfcache)
  const lastScrollYRef = useRef(0);
  useEffect(() => {
    const save = () => {
      lastScrollYRef.current = window.scrollY;
      try { sessionStorage.setItem(SCROLL_KEY(fullHref), String(Math.round(window.scrollY))); } catch (_) {}
    };
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      // Use ref value — window.scrollY may already be 0 at cleanup time
      try { sessionStorage.setItem(SCROLL_KEY(fullHref), String(Math.round(lastScrollYRef.current))); } catch (_) {}
      window.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", save);
    };
  }, [fullHref]);'''

# Fix 2: don't overwrite saved position in popstate
old2 = '''    const onPopState = () => {
      // Save using full href captured before wouter updates
      saveScrollPosition(prevPathRef.current);
      isPopStateRef.current = true;
    };'''

new2 = '''    const onPopState = () => {
      // Do NOT save here — scrollY is 0 by this point
      // The scroll listener already saved the correct position
      isPopStateRef.current = true;
    };'''

c = c.replace(old1, new1)
c = c.replace(old2, new2)

with open('artifacts/sakura-beauty/src/App.tsx', 'w') as f:
    f.write(c)

print("Fix1:", new1[:30] in c)
print("Fix2:", 'Do NOT save here' in c)
