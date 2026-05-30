import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "framer-motion";
import Reveal from "./Reveal";

function Stat({ end, suffix = "", label }: { end: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, end, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, end]);

  return (
    <div className="p" ref={ref}>
      <b>{val.toLocaleString("en-US")}{suffix}</b>
      <span>{label}</span>
    </div>
  );
}

export default function Proof() {
  return (
    <section id="proof" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <Reveal className="sec-head">
          <div className="eyebrow">Methodology</div>
          <h2>Built to be trusted,<br />not just believed.</h2>
          <p>A financial consultant charges $1,500–$25,000 to stress-test a model. Quantis runs the same rigor in 90 seconds — and shows its work on every line.</p>
        </Reveal>

        <Reveal className="proof">
          <Stat end={95500} label="verified benchmarks" />
          <Stat end={12} label="financial variables" />
          <Stat end={1000} label="simulations / run" />
          <Stat end={50} suffix="+" label="global cities" />
        </Reveal>
      </div>
    </section>
  );
}
