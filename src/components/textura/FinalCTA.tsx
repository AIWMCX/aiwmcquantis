import { Link } from "react-router-dom";
import Reveal from "./Reveal";

export default function FinalCTA() {
  return (
    <section className="cta-final">
      <div className="wrap">
        <Reveal>
          <h2 className="display">Don&apos;t bet $100,000<br />on a <em>guess.</em></h2>
          <p>Run the numbers first. Free, 90 seconds, no card. The report does the convincing.</p>
          <Link className="btn btn-primary btn-lg" to="/auth">Stress-test my idea now →</Link>
        </Reveal>
      </div>
    </section>
  );
}
