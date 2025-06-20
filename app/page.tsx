'use client';

import { useState, useEffect } from 'react';
import PowerSourceCard from '@/components/PowerSourceCard';
import FuelLevelCard from '@/components/FuelLevelCard';
import HistoryModal from '@/components/HistoryModal';
import AddDataModal from '@/components/AddDataModal';
import DetailStatusModal from '@/components/DetailStatusModal';
import SystemStatusIndicator from '@/components/SystemStatusIndicator';

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddDataModal, setShowAddDataModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState<string>('');

  // Initialize dark mode from system preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener('change', handleColorSchemeChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleColorSchemeChange);
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleDetailClick = (id: string) => {
    setSelectedDetailId(id);
    setShowDetailModal(true);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 transition-all min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md relative">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <i className="fas fa-bolt text-pln mr-2 text-xl"></i>
            {/* Hide PowerGuard text on mobile */}
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white hidden sm:block">PowerGuard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <SystemStatusIndicator />
            <button
              onClick={() => setShowAddDataModal(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              title="Tambah Data"
            >
              <i className="fas fa-plus"></i>
            </button>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              title="Riwayat Status"
            >
              <i className="fas fa-history"></i>
            </button>
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <i className="fas fa-sun"></i>
              ) : (
                <i className="fas fa-moon"></i>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6 flex items-center justify-center overflow-auto neon-bg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-6xl mt-12 mb-16 md:my-4">
          <PowerSourceCard />
          <FuelLevelCard />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 shadow-inner py-4 relative">
        <div className="container mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          &copy; 2025 PowerGuard - BBMKG I. All rights reserved.
        </div>
      </footer>

      {/* Modals */}
      <HistoryModal 
        isOpen={showHistoryModal} 
        onClose={() => setShowHistoryModal(false)} 
        onDetailClick={handleDetailClick}
      />
      <AddDataModal 
        isOpen={showAddDataModal} 
        onClose={() => setShowAddDataModal(false)} 
      />
      <DetailStatusModal 
        isOpen={showDetailModal} 
        onClose={() => setShowDetailModal(false)} 
        detailId={selectedDetailId}
      />
    </div>
  );
}