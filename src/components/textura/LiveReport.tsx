import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";

const C = 2 * Math.PI * 42;
const SCORE = 71;
const BARS = [
  { h: 40, label: "$1.9k" },
  { h: 66, label: "$4.2k" },
  { h: 100, label: "$7.1k" },
];

export default function LiveReport() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, SCORE, {
      duration: 1.3,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setScore(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView]);

  return (
    <div className="instrument" id="report" ref={ref}>
      <div className="inst-head">
        <div className="inst-title"><span className="dot" />quantis.engine · live</div>
        <div className="inst-tag">Report #4,182</div>
      </div>

      <div className="inst-body">
        <div className="inst-q">
          › analyzing: <b>&quot;Specialty coffee shop, remote-work focus — Denver, CO&quot;</b>
        </div>

        <div className="verdict">
          <div className="gauge">
            <svg viewBox="0 0 100 100" width="96" height="96">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none" stroke="#2FE6C0" strokeWidth="8"
                strokeLinecap="round" transform="rotate(-90 50 50)"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={inView ? { strokeDashoffset: C - (C * SCORE) / 100 } : {}}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <div className="score"><b>{score}</b><span>VIABILITY</span></div>
          </div>
          <div className="verdict-txt">
            <b>Viable — with caution</b>
            <span>Solid margins, but a saturated market and rent exposure need a plan.</span>
          </div>
        </div>

        <div className="metrics">
          <div className="metric"><div className="lbl">Proj. revenue / mo</div><div className="val">$28,500</div></div>
          <div className="metric"><div className="lbl">Gross margin</div><div className="val">62%</div></div>
          <div className="metric"><div className="lbl">Break-even</div><div className="val">Mo. 8</div></div>
          <div className="metric"><div className="lbl">LTV : CAC</div><div className="val">4.2<small>×</small></div></div>
        </div>

        <div className="band">
          <div className="row"><span>NET PROFIT · P10 / P50 / P90</span><span>monte-carlo · 1,000 runs</span></div>
          <div className="bars">
            {BARS.map((b, i) => (
              <motion.div
                key={i} className="bar"
                initial={{ height: 0 }}
                animate={inView ? { height: b.h + "%" } : {}}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.14 }}
              >
                <span>{b.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flags">
          <div className="flag hi"><i /><div><b>High rent exposure</b> — downtown Denver runs $4,800/mo on a fixed lease.</div></div>
          <div className="flag md"><i /><div><b>Saturated market</b> — 2,400+ coffee shops in metro; differentiation required.</div></div>
          <div className="flag md"><i /><div><b>Seasonal variance</b> — foot traffic swings ±18% across the year.</div></div>
        </div>
      </div>
    </div>
  );
}
