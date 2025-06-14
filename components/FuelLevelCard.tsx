'use client';

import { useState, useEffect } from 'react';
import { subscribeToLatestFuelLevel, FuelLevel } from '@/lib/firebaseService';

interface DualFuelLevel {
  reservoir: number;
  drum: number;
  datetime: string;
}

export default function FuelLevelCard() {
  const [fuelLevels, setFuelLevels] = useState({
    reservoir: 85,
    drum: 75
  });
  const [updateTime, setUpdateTime] = useState('10 Mei 2025, 15:30 WIB');

  useEffect(() => {
    const unsubscribe = subscribeToLatestFuelLevel((level: any) => {
      // Convert datetime format from dd/mm/yyyy hh:mm:ss to readable format
      const formatDisplayDateTime = (datetime: string) => {
        try {
          const [datePart, timePart] = datetime.split(' ');
          const [day, month, year] = datePart.split('/');
          const [hours, minutes] = timePart.split(':');
          
          const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];
          
          return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}, ${hours}:${minutes} WIB`;
        } catch (error) {
          return datetime;
        }
      };

      // Handle both old single level format and new dual tank format
      if (level.reservoir !== undefined && level.drum !== undefined) {
        // New dual tank format
        setFuelLevels({
          reservoir: level.reservoir,
          drum: level.drum
        });
      } else if (level.level !== undefined) {
        // Old single level format - use as reservoir, set drum to similar level
        setFuelLevels({
          reservoir: level.level,
          drum: Math.max(0, level.level - 10) // Drum slightly lower than reservoir
        });
      }
      
      setUpdateTime(formatDisplayDateTime(level.datetime));
    });

    return unsubscribe;
  }, []);

  const getFuelColor = (level: number) => {
    if (level >= 70) return 'from-blue-400 to-blue-600'; // Normal - Biru
    if (level >= 40) return 'from-green-400 to-green-600'; // Sedang - Hijau
    if (level >= 20) return 'from-yellow-400 to-yellow-600'; // Rendah - Kuning
    return 'from-red-400 to-red-600'; // Perlu diisi ulang - Merah
  };

  const getFuelStatusBadge = (level: number) => {
    if (level >= 70) {
      return 'inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-500 text-white text-xs sm:text-sm font-medium';
    } else if (level >= 40) {
      return 'inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-green-500 text-white text-xs sm:text-sm font-medium';
    } else if (level >= 20) {
      return 'inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-yellow-500 text-white text-xs sm:text-sm font-medium';
    } else {
      return 'inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-red-500 text-white text-xs sm:text-sm font-medium warning-blink';
    }
  };

  const getFuelStatusIcon = (level: number) => {
    if (level >= 70) return 'fas fa-check-circle';
    if (level >= 40) return 'fas fa-info-circle';
    if (level >= 20) return 'fas fa-exclamation-triangle';
    return 'fas fa-exclamation-circle';
  };

  const getFuelStatusText = (level: number) => {
    if (level >= 70) return 'Normal';
    if (level >= 40) return 'Sedang';
    if (level >= 20) return 'Rendah';
    return 'Kritis';
  };

  const getOverallStatus = () => {
    const minLevel = Math.min(fuelLevels.reservoir, fuelLevels.drum);
    if (minLevel >= 70) return 'Level Normal';
    if (minLevel >= 40) return 'Level Sedang';
    if (minLevel >= 20) return 'Level Rendah';
    return 'Perlu Diisi Ulang';
  };

  const getOverallStatusBadge = () => {
    const minLevel = Math.min(fuelLevels.reservoir, fuelLevels.drum);
    if (minLevel >= 70) {
      return 'inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-blue-500 text-white text-sm sm:text-base font-medium';
    } else if (minLevel >= 40) {
      return 'inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-green-500 text-white text-sm sm:text-base font-medium';
    } else if (minLevel >= 20) {
      return 'inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-yellow-500 text-white text-sm sm:text-base font-medium';
    } else {
      return 'inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-red-500 text-white text-sm sm:text-base font-medium warning-blink';
    }
  };

  const renderFuelTank = (level: number, title: string, icon: string) => (
    <div className="flex flex-col items-center flex-1">
      {/* Tank Title with spacing */}
      <div className="mb-6 text-center">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-700 dark:text-gray-300">
          <i className={`${icon} mr-2 text-emerald-500`}></i>
          {title}
        </h3>
      </div>
      
      {/* Large Fuel Tank */}
      <div className="relative w-28 sm:w-36 lg:w-44 h-48 sm:h-56 lg:h-64 mb-4">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Fuel Tank Body with enhanced 3D effect */}
          <div className="relative w-full h-[90%] rounded-3xl bg-gradient-to-br from-gray-300 via-gray-200 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500 shadow-2xl overflow-hidden" 
               style={{
                 boxShadow: 'inset 0 8px 16px rgba(0,0,0,0.15), 0 12px 32px rgba(0,0,0,0.25), 0 4px 8px rgba(0,0,0,0.1)'
               }}>
            
            {/* Inner glass container */}
            <div className="absolute inset-3 rounded-2xl overflow-hidden bg-opacity-40 bg-white dark:bg-opacity-20 dark:bg-gray-800 border border-white border-opacity-30" 
                 style={{
                   backdropFilter: 'blur(4px)', 
                   boxShadow: 'inset 0 0 20px rgba(255,255,255,0.4), inset 0 2px 4px rgba(255,255,255,0.6)'
                 }}>
              
              {/* Fuel Level with enhanced animation */}
              <div 
                className={`absolute bottom-0 left-0 right-0 transition-all duration-1500 ease-out bg-gradient-to-t ${getFuelColor(level)}`}
                style={{height: `${level}%`}}
              >
                {/* Enhanced liquid shine effect */}
                <div className="absolute top-0 left-0 right-0 h-[20%] bg-gradient-to-b from-white to-transparent opacity-40"></div>
                <div className="absolute top-[10%] left-0 right-0 h-[5%] bg-white opacity-20"></div>
                
                {/* Enhanced bubbles animation */}
                <div className="absolute bottom-6 left-3 w-2 h-2 rounded-full bg-white bg-opacity-70 animate-ping" 
                     style={{animationDuration: '3s', animationDelay: '1s'}}></div>
                <div className="absolute bottom-10 right-4 w-1.5 h-1.5 rounded-full bg-white bg-opacity-60 animate-ping" 
                     style={{animationDuration: '2.5s'}}></div>
                <div className="absolute bottom-14 left-1/3 w-1 h-1 rounded-full bg-white bg-opacity-50 animate-ping" 
                     style={{animationDuration: '4s', animationDelay: '0.5s'}}></div>
                <div className="absolute bottom-8 right-1/4 w-0.5 h-0.5 rounded-full bg-white bg-opacity-60 animate-ping" 
                     style={{animationDuration: '3.5s', animationDelay: '2s'}}></div>
              </div>
              
              {/* Large percentage display */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white bg-opacity-95 dark:bg-gray-900 dark:bg-opacity-90 px-3 py-2 rounded-xl shadow-xl border border-white border-opacity-50">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">{level}%</span>
                </div>
              </div>
            </div>
            
            {/* Enhanced tank details */}
            <div className="absolute top-0 left-1/4 w-1/2 h-1.5 bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-500 dark:to-gray-400 rounded-b-lg shadow-sm"></div>
            <div className="absolute bottom-0 left-1/3 w-1/3 h-1.5 bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-500 dark:to-gray-400 rounded-t-lg shadow-sm"></div>
          </div>
          
          {/* Enhanced fuel cap */}
          <div className="absolute top-[-12px] left-1/2 transform -translate-x-1/2 w-10 h-5 bg-gradient-to-br from-gray-400 via-gray-300 to-gray-200 dark:from-gray-600 dark:via-gray-500 dark:to-gray-400 rounded-t-xl shadow-lg flex items-center justify-center" 
               style={{boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3)'}}>
            <div className="w-6 h-2 bg-gradient-to-r from-gray-500 to-gray-400 dark:from-gray-400 dark:to-gray-300 rounded-full" 
                 style={{boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)'}}></div>
          </div>
          
          {/* Enhanced tank base */}
          <div className="absolute bottom-[-12px] left-1/2 transform -translate-x-1/2 w-[70%] h-4 bg-gradient-to-br from-gray-400 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500 rounded-lg shadow-lg"></div>
        </div>
      </div>
      
      {/* Individual Tank Status */}
      <div className="text-center">
        <div className={getFuelStatusBadge(level)}>
          <i className={`${getFuelStatusIcon(level)} mr-1 text-xs`}></i>
          <span>{getFuelStatusText(level)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 transition-all h-full flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col items-center justify-center mb-4 sm:mb-6">
        <h2 className="text-lg lg:text-xl font-semibold text-gray-800 dark:text-white mb-1">Level Minyak Genset</h2>
        <span className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
          Diperbarui: <span>{updateTime}</span>
        </span>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-grow">
        {/* Dual Tank Display - Takes most of the card space */}
        <div className="flex justify-center items-start gap-8 sm:gap-12 lg:gap-16 mb-6 w-full">
          {renderFuelTank(fuelLevels.reservoir, 'Tangki Reservoir', 'fas fa-gas-pump')}
          {renderFuelTank(fuelLevels.drum, 'Tangki Utama', 'fas fa-oil-can')}
        </div>
        
        {/* Overall Status */}
        <div className="text-center">
          <div className={getOverallStatusBadge()}>
            <i className={`${getFuelStatusIcon(Math.min(fuelLevels.reservoir, fuelLevels.drum))} mr-2 text-lg`}></i>
            <span>{getOverallStatus()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}