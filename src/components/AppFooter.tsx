
import React from 'react';
import { Mail } from 'lucide-react';

const AppFooter: React.FC = () => {
  return (
    <footer className="mt-12 sm:mt-16 text-center text-xs text-muted-foreground py-6 space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Mail className="w-4 h-4" />
        <span>Support:</span>
        <a 
          href="mailto:support@aiwmcquantis.com" 
          className="text-primary hover:text-primary/80 transition-colors font-medium"
        >
          support@aiwmcquantis.com
        </a>
      </div>
      <p>© {new Date().getFullYear()} AIWMC Quantis™. All rights reserved.</p>
    </footer>
  );
};

export default AppFooter;
