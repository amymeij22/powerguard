'use client';

import { useState, useEffect } from 'react';
import { subscribeToLatestFuelLevel, FuelLevel } from '@/lib/firebaseService';

export default function FuelLevelCard() {
  const [fuelLevel, setFuelLevel] = useState(85);
  const [fuelStatus, setFuelStatus] = useState('Level Normal');
  const [updateTime, setUpdateTime] = useState('10 Mei 2025, 15:30 WIB');

  useEffect(() => {
    const unsubscribe = subscribeToLatestFuelLevel((level: FuelLevel & { id: string }) => {
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

      setFuelLevel(level.level);
      setUpdateTime(formatDisplayDateTime(level.datetime));
      setFuelStatus(getFuelStatusText(level.level));
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
      return 'inline-flex items-center px-3 sm:px-4 lg:px-6 py-2 sm:py-2 lg:py-3 rounded-full bg-blue-500 text-white text-sm sm:text-base font-medium';
    } else if (level >= 40) {
      return 'inline-flex items-center px-3 sm:px-4 lg:px-6 py-2 sm:py-2 lg:py-3 rounded-full bg-green-500 text-white text-sm sm:text-base font-medium';
    } else if (level >= 20) {
      return 'inline-flex items-center px-3 sm:px-4 lg:px-6 py-2 sm:py-2 lg:py-3 rounded-full bg-yellow-500 text-white text-sm sm:text-base font-medium';
    } else {
      return 'inline-flex items-center px-3 sm:px-4 lg:px-6 py-2 sm:py-2 lg:py-3 rounded-full bg-red-500 text-white text-sm sm:text-base font-medium warning-blink';
    }
  };

  const getFuelStatusIcon = (level: number) => {
    if (level >= 70) return 'fas fa-check-circle';
    if (level >= 40) return 'fas fa-info-circle';
    if (level >= 20) return 'fas fa-exclamation-triangle';
    return 'fas fa-exclamation-circle';
  };

  const getFuelStatusText = (level: number) => {
    if (level >= 70) return 'Level Normal';
    if (level >= 40) return 'Level Sedang';
    if (level >= 20) return 'Level Rendah';
    return 'Perlu Diisi Ulang';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 transition-all h-full flex flex-col relative">
      <div className="flex flex-col items-center justify-center mb-3 sm:mb-4 lg:mb-6">
        <h2 className="text-lg lg:text-xl font-semibold text-gray-800 dark:text-white mb-1">Level Minyak Genset</h2>
        <span className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
          Diperbarui: <span>{updateTime}</span>
        </span>
      </div>
      
      <div className="flex flex-col items-center justify-center py-3 sm:py-4 lg:py-6 flex-grow">
        <div className="relative w-36 sm:w-40 lg:w-48 h-48 sm:h-56 lg:h-64 mb-3 sm:mb-4 lg:mb-6">
          {/* Improved Fuel Tank Visualization */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Fuel Tank Body with 3D effect */}
            <div className="relative w-full h-[85%] rounded-3xl bg-gradient-to-r from-gray-300 to-gray-100 dark:from-gray-700 dark:to-gray-600 shadow-lg overflow-hidden" style={{boxShadow: 'inset 0 5px 10px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.2)'}}>
              
              {/* Fuel Level Container with glass effect */}
              <div className="absolute inset-2 rounded-2xl overflow-hidden bg-opacity-50 bg-white dark:bg-opacity-10 dark:bg-gray-800" style={{backdropFilter: 'blur(2px)', boxShadow: 'inset 0 0 15px rgba(255,255,255,0.3)'}}>
                
                {/* Fuel Level Animation */}
                <div 
                  className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 bg-gradient-to-t ${getFuelColor(fuelLevel)}`}
                  style={{height: `${fuelLevel}%`}}
                >
                  {/* Liquid Shine Effect */}
                  <div className="absolute top-0 left-0 right-0 h-[15%] bg-white bg-opacity-30 dark:bg-opacity-20"></div>
                  
                  {/* Bubbles animation */}
                  <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-white bg-opacity-60 dark:bg-opacity-40 animate-ping" style={{animationDuration: '3s', animationDelay: '1s'}}></div>
                  <div className="absolute bottom-8 right-6 w-1.5 h-1.5 rounded-full bg-white bg-opacity-60 dark:bg-opacity-40 animate-ping" style={{animationDuration: '2.5s'}}></div>
                  <div className="absolute bottom-12 left-1/3 w-1 h-1 rounded-full bg-white bg-opacity-60 dark:bg-opacity-40 animate-ping" style={{animationDuration: '4s', animationDelay: '0.5s'}}></div>
                </div>
                
                {/* Fuel Level Percentage Display */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white bg-opacity-90 dark:bg-gray-900 dark:bg-opacity-80 px-4 py-1.5 rounded-full shadow-lg">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">{fuelLevel}%</span>
                  </div>
                </div>
              </div>
              
              {/* Tank detail lines */}
              <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gray-400 dark:bg-gray-500 rounded-b-lg"></div>
              <div className="absolute bottom-0 left-1/3 w-1/3 h-1 bg-gray-400 dark:bg-gray-500 rounded-t-lg"></div>
            </div>
            
            {/* Fuel Cap/Lid with 3D effect */}
            <div className="absolute top-[-15px] left-1/2 transform -translate-x-1/2 w-12 h-6 bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-600 dark:to-gray-500 rounded-t-xl shadow-md flex items-center justify-center" style={{boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2)'}}>
              <div className="w-6 h-2 bg-gray-500 dark:bg-gray-400 rounded-full" style={{boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)'}}></div>
            </div>
            
            {/* Tank base/support */}
            <div className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-[60%] h-3 bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg shadow-md"></div>
          </div>
        </div>
        
        <div className={getFuelStatusBadge(fuelLevel)}>
          <i className={`${getFuelStatusIcon(fuelLevel)} mr-1 sm:mr-2 text-lg lg:text-xl`}></i>
          <span>{fuelStatus}</span>
        </div>
      </div>
    </div>
  );
}