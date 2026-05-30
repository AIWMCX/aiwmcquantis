import Reveal from "./Reveal";

const STEPS = [
  {
    n: "STEP 01",
    title: "Describe the idea",
    body: "\u201CCoffee shop with a remote-work focus in Denver.\u201D That\u2019s it — plain English plus a city. No financial background needed.",
    icon: <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />,
  },
  {
    n: "STEP 02",
    title: "The engine runs the math",
    body: "A deterministic engine — not AI guesswork — computes 12 financial variables and runs 1,000 Monte-Carlo simulations, adjusted to your city.",
    icon: (
      <>
        <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1M7.7 16.3l-2.1 2.1" strokeLinecap="round" />
        <circle cx="12" cy="12" r="3.4" />
      </>
    ),
  },
  {
    n: "STEP 03",
    title: "Get your risk report",
    body: "Revenue, break-even, unit economics, ranked risk flags and a launch checklist — in under a minute, every figure sourced.",
    icon: (
      <>
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="4" y="4" width="16" height="16" rx="3" />
      </>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how">
      <div className="wrap">
        <Reveal className="sec-head">
          <div className="eyebrow">The process</div>
          <h2>Three steps from a sentence<br />to financial clarity.</h2>
          <p>No spreadsheets, no finance degree. Describe the idea in plain language — the engine does the rest.</p>
        </Reveal>

        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={i} className="step" delay={i * 0.08}>
              <div className="ic">
                <svg viewBox="0 0 24 24" strokeWidth="1.8">{s.icon}</svg>
              </div>
              <div className="num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
