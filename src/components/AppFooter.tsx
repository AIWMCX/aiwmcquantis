
import React from 'react';

const AppFooter: React.FC = () => {
  return (
    <footer className="mt-12 sm:mt-16 text-center text-xs text-muted-foreground py-6">
      © {new Date().getFullYear()} AIWMC Quantis™. All rights reserved.
    </footer>
  );
};

export default AppFooter;
