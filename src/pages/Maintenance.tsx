import React, { useEffect } from 'react';
import { Wrench } from 'lucide-react';

const Maintenance: React.FC = () => {
  useEffect(() => {
    document.title = 'AIWMC Quantis — Temporarily Down for Maintenance';
  }, []);

  return (
    <main className="min-h-screen bg-[#070D1A] text-white flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-8">
          <Wrench className="w-7 h-7 text-[#8FFF2A]" aria-hidden="true" />
        </div>

        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5" style={{ fontFamily: "'Cabinet Grotesk', system-ui, sans-serif" }}>
          We're experiencing technical difficulties.
        </h1>

        <p className="text-base md:text-lg text-white/70 leading-relaxed mb-8" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          Our team is actively working on a fix and AIWMC Quantis will be back online very shortly.
          We sincerely apologize for the inconvenience and appreciate your patience.
        </p>

        <div className="flex items-center justify-center gap-2 text-sm text-white/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8FFF2A] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8FFF2A]" />
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            status: restoring service
          </span>
        </div>

        <p className="mt-12 text-xs text-white/40">
          Need to reach us? <a href="mailto:support@aiwmcquantis.com" className="text-white/70 hover:text-[#8FFF2A] underline underline-offset-4">support@aiwmcquantis.com</a>
        </p>

        <p className="mt-10 text-[11px] uppercase tracking-[0.2em] text-white/30">
          AIWMC™ Quantis · by AIWMC™ LLC
        </p>
      </div>
    </main>
  );
};

export default Maintenance;
