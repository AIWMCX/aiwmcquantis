const SOURCES = [
  "U.S. SMALL BUSINESS ADMINISTRATION",
  "IBISWORLD",
  "U.S. CENSUS BUREAU",
  "BUREAU OF LABOR STATISTICS",
  "OECD",
  "100+ INDUSTRY TYPES",
  "50+ GLOBAL CITIES",
];

export default function Marquee() {
  const row = [...SOURCES, ...SOURCES];
  return (
    <div className="marquee-sec">
      <div className="wrap">
        <div className="marquee-lbl kicker">Every number sourced &amp; auditable — drawn from</div>
      </div>
      <div className="marquee-track">
        {row.map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
    </div>
  );
}
