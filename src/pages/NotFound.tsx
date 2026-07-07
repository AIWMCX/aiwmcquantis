import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

import { logger } from '@/lib/logger';
import { PageMeta } from '@/components/seo/PageMeta';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <PublicPageShell maxWidth="md">
      <PageMeta
        title="Page not found (404)"
        description="The page you are looking for does not exist. Return to AIWMC Quantis to stress-test your business idea."
        path={location.pathname}
        noIndex
      />
      <section className="py-24 md:py-32 text-center">
        <p
          className="text-sm font-bold uppercase tracking-[0.18em] mb-4"
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: 'var(--aiwmc-grad-cyan)' }}
        >
          404
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          This page doesn't exist
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The route you followed isn't a real Quantis page. Head back and stress-test your business idea instead.
        </p>
        <Link to="/">
          <Button size="lg" className="gap-2">Return home</Button>
        </Link>
      </section>
    </PublicPageShell>
  );
};

export default NotFound;
