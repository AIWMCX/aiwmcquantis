import { Link } from "react-router-dom";
import Reveal from "./Reveal";

const Check = () => (
  <svg viewBox="0 0 24 24" strokeWidth={2}><path d="M5 12l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Cross = () => (
  <svg viewBox="0 0 24 24" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
);

interface Plan {
  name: string;
  price: string;
  unit: string;
  tag: string;
  cta: string;
  href: string;
  feature?: boolean;
  items: { t: string; off?: boolean }[];
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    unit: "",
    tag: "For founders pressure-testing one idea.",
    cta: "Start free",
    href: "/auth",
    items: [
      { t: "3 full analyses / month" },
      { t: "Complete on-screen report" },
      { t: "Risk flags & action plan" },
      { t: "PDF export", off: true },
    ],
  },
  {
    name: "Plus",
    price: "$17",
    unit: " / mo",
    tag: "A polished, sourced PDF to put in front of investors, lenders or a landlord.",
    cta: "Get Plus",
    href: "/pricing",
    feature: true,
    items: [
      { t: "Investor- & lender-ready PDF" },
      { t: "3-scenario projections" },
      { t: "Full source attribution" },
      { t: "Scenario comparison & alerts" },
    ],
  },
  {
    name: "Pro",
    price: "$49",
    unit: " / mo",
    tag: "For consultants, accelerators & fractional CFOs who validate ideas all week.",
    cta: "Start Pro",
    href: "/pricing",
    items: [
      { t: "Unlimited analyses" },
      { t: "Unlimited PDF exports" },
      { t: "Team workspace (5 seats)" },
      { t: "API, webhooks & priority queue" },
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing">
      <div className="wrap">
        <Reveal className="sec-head center">
          <div className="eyebrow">Pricing</div>
          <h2>Pay for the moment<br />you actually need it.</h2>
          <p>Start free. Upgrade only when you need investor-ready reports or you validate ideas for a living.</p>
        </Reveal>

        <div className="pricing">
          {PLANS.map((p, i) => (
            <Reveal key={i} className={`plan${p.feature ? " feature" : ""}`} delay={i * 0.07}>
              <div className="pname">{p.name}</div>
              <div className="price">{p.price}<small>{p.unit}</small></div>
              <div className="ptag">{p.tag}</div>
              <ul>
                {p.items.map((it, j) => (
                  <li key={j} className={it.off ? "off" : ""}>
                    {it.off ? <Cross /> : <Check />}{it.t}
                  </li>
                ))}
              </ul>
              <Link to={p.href} className={`btn ${p.feature ? "btn-primary" : "btn-ghost"} btn-lg`}>{p.cta}</Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
