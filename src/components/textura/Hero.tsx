import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import DataField from "./DataField";
import LiveReport from "./LiveReport";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const lineUp = {
  hidden: { y: "110%" },
  show: { y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const } },
};
const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <DataField />
      <div className="wrap">
        <div className="hero-grid">
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.div className="eyebrow" variants={fade}>
              Financial pre-mortem engine
            </motion.div>

            <h1 className="display">
              <span className="lineclip"><motion.span style={{ display: "block" }} variants={lineUp}>Will your idea</motion.span></span>
              <span className="lineclip"><motion.span style={{ display: "block" }} variants={lineUp}>actually <em>make money?</em></motion.span></span>
              <span className="lineclip"><motion.span style={{ display: "block" }} variants={lineUp}>Know in 90 seconds.</motion.span></span>
            </h1>

            <motion.p className="hero-sub" variants={fade}>
              90% of businesses fail within 5 years — most never ran the numbers. Quantis
              stress-tests your idea against 95,500 real benchmarks and shows revenue,
              break-even and every risk flag <b>before you spend a dollar.</b>
            </motion.p>

            <motion.div className="hero-cta" variants={fade}>
              <Link className="btn btn-primary btn-lg" to="/auth">Stress-test my idea — free</Link>
              <a className="btn btn-ghost btn-lg" href="#report">See a real report ↓</a>
            </motion.div>

            <motion.div className="hero-meta" variants={fade}>
              <div className="m"><b>90 sec</b><span>to full report</span></div>
              <div className="m"><b>95,500</b><span>real benchmarks</span></div>
              <div className="m"><b>$0</b><span>no card required</span></div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          >
            <LiveReport />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
