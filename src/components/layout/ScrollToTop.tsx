import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * React Router does not reset scroll on navigation, so clicking a link near
 * the bottom of one page opened the next page at the same height — it looked
 * like the click did nothing. On every new navigation (link click or
 * redirect) start the page at the top; when the URL has a #hash, scroll to
 * that element instead (retrying briefly, since lazy routes mount late).
 * Back/forward (POP) keeps the browser's own position.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;

    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    let id = "";
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      id = hash.slice(1);
    }
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const seek = () => {
      const el = id ? document.getElementById(id) : null;
      if (el) {
        el.scrollIntoView({ block: "start" });
        return;
      }
      if (tries === 0) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (++tries < 20) timer = setTimeout(seek, 100);
    };
    seek();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pathname, hash, navigationType]);

  return null;
}
