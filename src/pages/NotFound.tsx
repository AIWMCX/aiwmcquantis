import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

import { logger } from '@/lib/logger';
import { PageMeta } from '@/components/seo/PageMeta';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <PageMeta
        title="Page not found (404)"
        description="The page you are looking for does not exist. Return to AIWMC Quantis to stress-test your business idea."
        path={location.pathname}
        noIndex
      />
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center px-4">
          <h1 className="text-5xl font-bold mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-6">Oops! This page doesn't exist.</p>
          <Link to="/" className="text-primary hover:underline font-medium">
            Return to Home
          </Link>
        </div>
      </main>
    </>
  );
};

export default NotFound;
