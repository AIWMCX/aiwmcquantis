import { useEffect } from "react";
import { useBotDetection, isBot } from "@/hooks/useBotDetection";
import { useAuth } from "@/hooks/useAuth";
import { StructuredData } from "@/components/seo/StructuredData";
import { PageSEO } from "@/components/seo/PageSEO";
import { recordFunnelEvent } from "@/lib/analytics";
import { PopupManager } from "@/components/marketing/PopupManager";

import Nav from "@/components/textura/Nav";
import Hero from "@/components/textura/Hero";
import Marquee from "@/components/textura/Marquee";
import HowItWorks from "@/components/textura/HowItWorks";
import Proof from "@/components/textura/Proof";
import Pricing from "@/components/textura/Pricing";
import FinalCTA from "@/components/textura/FinalCTA";
import TexturaFooter from "@/components/textura/Footer";

import "@/styles/textura.css";

/**
 * AIWMC Quantis — TEXTURA-grade landing.
 * High-tech, instrument-panel aesthetic. Dark, signal-green accent, animated
 * canvas data-field hero, live report module, scoped under `.qtx` so it does
 * not affect the rest of the app (admin, dashboards, auth).
 */
export default function Landing() {
  useBotDetection();
  const { user } = useAuth();

  useEffect(() => {
    if (!isBot()) {
      recordFunnelEvent("home_view", { variant: "textura_v1", authed: !!user });
    }
  }, [user]);

  return (
    <div className="qtx">
      <PageSEO
        title="AIWMC Quantis — Will your idea make money? Find out in 90 seconds."
        description="Stress-test any business idea against 95,500 real benchmarks. See revenue, break-even and every risk flag before you spend a dollar. Free, no card required."
        canonical="https://www.aiwmcquantis.com/"
      />
      <StructuredData type="WebSite" />

      <div className="fx-grid" aria-hidden />
      <div className="fx-grain" aria-hidden />
      <div className="glow a" aria-hidden />
      <div className="glow b" aria-hidden />

      <Nav />
      <main>
        <Hero />
        <Marquee />
        <HowItWorks />
        <Proof />
        <Pricing />
        <FinalCTA />
      </main>
      <TexturaFooter />

      {!isBot && <PopupManager />}
    </div>
  );
}
