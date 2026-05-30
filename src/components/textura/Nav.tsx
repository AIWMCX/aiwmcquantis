import { Link } from "react-router-dom";

function Logo() {
  return (
    <span className="mark">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 17l5-6 4 4 6-9" stroke="#2FE6C0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18" cy="6" r="2" fill="#2FE6C0" />
      </svg>
    </span>
  );
}

export default function Nav() {
  return (
    <nav>
      <div className="nav-in">
        <a className="brand" href="#hero">
          <Logo />
          AIWMC <b>Quantis</b>
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#report">Live report</a>
          <a href="#proof">Methodology</a>
          <a href="#pricing">Pricing</a>
        </div>
        <Link className="btn btn-primary" to="/auth">Validate free →</Link>
      </div>
    </nav>
  );
}
