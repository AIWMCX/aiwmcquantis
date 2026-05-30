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

export default function TexturaFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-in">
          <div className="foot-desc">
            <a className="brand" href="#hero"><Logo />AIWMC <b>Quantis</b></a>
            <p>AI-powered financial pre-mortem for founders. Validate before you build.</p>
          </div>
          <div className="foot-links">
            <div className="foot-col">
              <h5>Product</h5>
              <a href="#how">How it works</a>
              <a href="#report">Live report</a>
              <Link to="/pricing">Pricing</Link>
              <Link to="/methodology">Methodology</Link>
            </div>
            <div className="foot-col">
              <h5>Explore</h5>
              <Link to="/examples">Report examples</Link>
              <Link to="/blog">Blog</Link>
              <Link to="/risk-gallery">Risk gallery</Link>
              <Link to="/use-cases">Use cases</Link>
            </div>
            <div className="foot-col">
              <h5>Company</h5>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/security">Security</Link>
            </div>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 AIWMC™ LLC · Denver, Colorado</span>
          <span>quantis.engine · v3</span>
        </div>
      </div>
    </footer>
  );
}
