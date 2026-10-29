import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { readFileSync } from "node:fs";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

let go: ReturnType<typeof useNavigate>;
function Nav() {
  go = useNavigate();
  return null;
}

function setup(initial = "/a") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <ScrollToTop />
      <Nav />
      <Routes>
        <Route path="/a" element={<p>A</p>} />
        <Route path="/b" element={<h2 id="compare-links">B</h2>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ScrollToTop", () => {
  let scrollTo: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  });
  afterEach(() => vi.restoreAllMocks());

  it("starts a newly navigated page at the top", () => {
    setup();
    scrollTo.mockClear();
    act(() => go("/b"));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("scrolls to the #hash target instead of the top", () => {
    const into = vi.fn();
    Element.prototype.scrollIntoView = into;
    setup();
    scrollTo.mockClear();
    act(() => go("/b#compare-links"));
    expect(into).toHaveBeenCalledWith({ block: "start" });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("leaves back/forward navigation to the browser", () => {
    setup();
    act(() => go("/b"));
    scrollTo.mockClear();
    act(() => go(-1));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("is mounted inside the app router", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toMatch(/<BrowserRouter>\s*<ScrollToTop \/>/);
  });
});
