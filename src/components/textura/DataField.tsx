import { useEffect, useRef } from "react";

/**
 * DataField — animated benchmark telemetry: drifting nodes with proximity
 * links + subtle mouse parallax. Canvas-only, retina-aware, pauses off-screen,
 * respects prefers-reduced-motion.
 */
export default function DataField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1;
    let nodes: { x: number; y: number; vx: number; vy: number; z: number; r: number }[] = [];
    let raf: number | null = null;
    let running = true;
    const mouse = { x: 0.5, y: 0.5 };
    const SIGNAL = "47,230,192";

    function size() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = parent.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas!.width = w * dpr; canvas!.height = h * dpr;
      canvas!.style.width = w + "px"; canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(26, Math.min(64, Math.floor((w * h) / 16000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        z: 0.4 + Math.random() * 0.6,
        r: 0.8 + Math.random() * 1.6,
      }));
    }

    function frame() {
      if (!running) return;
      ctx!.clearRect(0, 0, w, h);
      const px = (mouse.x - 0.5) * 26;
      const py = (mouse.y - 0.5) * 26;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!reduce) { n.x += n.vx * n.z; n.y += n.vy * n.z; }
        if (n.x < -20) n.x = w + 20; if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; if (n.y > h + 20) n.y = -20;

        const dx = n.x + px * n.z;
        const dy = n.y + py * n.z;

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const ddx = (n.x - m.x), ddy = (n.y - m.y);
          const dist = Math.hypot(ddx, ddy);
          if (dist < 132) {
            const a = (1 - dist / 132) * 0.18 * n.z;
            ctx!.strokeStyle = `rgba(${SIGNAL},${a})`;
            ctx!.lineWidth = 0.6;
            ctx!.beginPath();
            ctx!.moveTo(dx, dy);
            ctx!.lineTo(m.x + px * m.z, m.y + py * m.z);
            ctx!.stroke();
          }
        }
        ctx!.beginPath();
        ctx!.arc(dx, dy, n.r * n.z, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${SIGNAL},${0.5 * n.z})`;
        ctx!.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: MouseEvent) {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
    }

    size();
    frame();
    window.addEventListener("resize", size);
    window.addEventListener("mousemove", onMove);

    const io = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running && !raf) frame();
      if (!running && raf) { cancelAnimationFrame(raf); raf = null; }
    }, { threshold: 0 });
    io.observe(canvas);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("mousemove", onMove);
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="datafield" aria-hidden />;
}
