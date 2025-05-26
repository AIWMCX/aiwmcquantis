
import React from 'react';

const AppFooter: React.FC = () => {
  return (
    <footer className="mt-12 sm:mt-16 text-center text-xs text-muted-foreground py-6">
      © {new Date().getFullYear()} AI Business Analyzer (AIWMC). Все права защищены.
    </footer>
  );
};

export default AppFooter;
