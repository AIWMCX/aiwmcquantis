
import React from 'react';

interface AppHeaderProps {
  darkMode: boolean;
  setDarkMode: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ darkMode, setDarkMode }) => {
  return (
    <header className="flex justify-between items-center mb-6 sm:mb-10">
      <h1 className="text-2xl sm:text-4xl font-bold text-primary">AIWMC Quantis™</h1>
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className="p-2 rounded-md hover:bg-muted transition-colors text-sm"
      >
        {darkMode ? '☀️ Светлая' : '🌙 Тёмная'}
      </button>
    </header>
  );
};

export default AppHeader;
