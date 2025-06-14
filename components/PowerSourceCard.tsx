'use client';

import { useState, useEffect } from 'react';
import { subscribeToLatestPowerStatus, PowerStatus } from '@/lib/firebaseService';

export default function PowerSourceCard() {
  const [powerStatus, setPowerStatus] = useState({
    pln: 1,
    genset135: 0,
    genset150: 0,
    gensetRadar: 0,
    updateTime: '10 Mei 2025, 15:30 WIB',
    description: 'Sumber listrik PLN aktif, genset otomatis nonaktif'
  });

  useEffect(() => {
    const unsubscribe = subscribeToLatestPowerStatus((status: PowerStatus & { id: string }) => {
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

      // Generate description based on status with updated logic
      const generateDescription = (pln: number, genset135: number, genset150: number, gensetRadar: number) => {
        if (pln) {
          // PLN aktif
          const activeGensets = [];
          if (genset135) activeGensets.push('135kVA');
          if (genset150) activeGensets.push('150kVA');
          if (gensetRadar) activeGensets.push('Radar');

          if (activeGensets.length === 0) {
            return 'PLN aktif, Genset otomatis nonaktif';
          } else {
            return `PLN aktif, Genset ${activeGensets.join(', ')} sedang dipanaskan`;
          }
        } else {
          // PLN nonaktif
          const mainGensetsActive = genset135 + genset150; // Count active main gensets
          const radarActive = gensetRadar;

          if (mainGensetsActive === 0) {
            // No main gensets active
            if (radarActive) {
              return 'PLN nonaktif, Genset Radar otomatis nyala, Genset 135kVA dan 150kVA harus aktifkan secara manual';
            } else {
              return 'PLN nonaktif, Genset 135kVA, 150kVA, dan Radar harus aktifkan secara manual';
            }
          } else if (mainGensetsActive === 1) {
            // One main genset active (normal operation)
            if (radarActive) {
              return 'PLN nonaktif, genset otomatis aktif';
            } else {
              return 'PLN nonaktif, genset otomatis aktif, Genset Radar harus aktifkan secara manual';
            }
          } else {
            // Both main gensets active (one operational, one warming up)
            if (radarActive) {
              return 'PLN nonaktif, genset otomatis aktif, genset operasional sedang dipanaskan';
            } else {
              return 'PLN nonaktif, genset otomatis aktif, genset operasional sedang dipanaskan, Genset Radar harus aktifkan secara manual';
            }
          }
        }
      };

      setPowerStatus({
        pln: status.pln,
        genset135: status.genset_135,
        genset150: status.genset_150,
        gensetRadar: status.genset_radar,
        updateTime: formatDisplayDateTime(status.datetime),
        description: generateDescription(status.pln, status.genset_135, status.genset_150, status.genset_radar)
      });
    });

    return unsubscribe;
  }, []);

  const getStatusBadgeClass = (status: number, type: string, gensetType?: string) => {
    const baseClasses = 'status-indicator p-3 rounded-lg flex flex-col items-center justify-center h-28 sm:h-32';
    
    if (status === 1) {
      if (type === 'pln') {
        return `${baseClasses} bg-pln text-white`;
      } else {
        return `${baseClasses} bg-genset text-white`;
      }
    } else {
      // PLN nonaktif - warna abu-abu biasa tanpa animasi
      if (type === 'pln') {
        return `${baseClasses} bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200`;
      }
      
      // Genset logic with updated rules
      if (type === 'genset') {
        // Check if this is a critical situation for Radar genset only
        const isCriticalRadar = powerStatus.pln === 0 && status === 0 && gensetType === 'Radar';
        
        // For main gensets (135kVA and 150kVA), only show critical if both are off when PLN is off
        const isCriticalMainGenset = powerStatus.pln === 0 && status === 0 && 
          (gensetType === '135kVA' || gensetType === '150kVA') &&
          powerStatus.genset135 === 0 && powerStatus.genset150 === 0;
        
        if (isCriticalRadar || isCriticalMainGenset) {
          return `${baseClasses} bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 critical-blink`;
        } else {
          return `${baseClasses} bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200`;
        }
      }
      
      return `${baseClasses} bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200`;
    }
  };

  const getStatusText = (status: number) => status === 1 ? 'Aktif' : 'Nonaktif';

  // Check if description should blink (emergency situation)
  const shouldDescriptionBlink = () => {
    // Only blink if PLN is off AND both main gensets are off OR radar is off
    return powerStatus.pln === 0 && (
      (powerStatus.genset135 === 0 && powerStatus.genset150 === 0) || 
      powerStatus.gensetRadar === 0
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 transition-all h-full flex flex-col relative">
      <div className="flex flex-col items-center justify-center mb-3 sm:mb-4 lg:mb-6">
        <h2 className="text-lg lg:text-xl font-semibold text-gray-800 dark:text-white mb-1">Status Sumber Listrik</h2>
        <span className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
          Diperbarui: <span>{powerStatus.updateTime}</span>
        </span>
      </div>
      
      <div className="flex flex-col items-center justify-start py-2 sm:py-4 lg:py-6 flex-grow">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 w-full max-w-3xl">
          {/* PLN Status Badge */}
          <div className={getStatusBadgeClass(powerStatus.pln, 'pln')}>
            <i className="fas fa-plug text-2xl sm:text-3xl lg:text-4xl mb-1 sm:mb-2"></i>
            <span className="label text-base sm:text-lg lg:text-xl font-medium">PLN</span>
            <span className="status text-sm sm:text-base">{getStatusText(powerStatus.pln)}</span>
          </div>
          
          {/* Genset 135kVA Status Badge */}
          <div className={getStatusBadgeClass(powerStatus.genset135, 'genset', '135kVA')}>
            <i className="fas fa-bolt text-2xl sm:text-3xl lg:text-4xl mb-1 sm:mb-2"></i>
            <span className="label text-base sm:text-lg lg:text-xl font-medium">Genset 135kVA</span>
            <span className="status text-sm sm:text-base">{getStatusText(powerStatus.genset135)}</span>
          </div>
          
          {/* Genset 150kVA Status Badge */}
          <div className={getStatusBadgeClass(powerStatus.genset150, 'genset', '150kVA')}>
            <i className="fas fa-bolt text-2xl sm:text-3xl lg:text-4xl mb-1 sm:mb-2"></i>
            <span className="label text-base sm:text-lg lg:text-xl font-medium">Genset 150kVA</span>
            <span className="status text-sm sm:text-base">{getStatusText(powerStatus.genset150)}</span>
          </div>
          
          {/* Genset Radar Status Badge */}
          <div className={getStatusBadgeClass(powerStatus.gensetRadar, 'genset', 'Radar')}>
            <i className="fas fa-bolt text-2xl sm:text-3xl lg:text-4xl mb-1 sm:mb-2"></i>
            <span className="label text-base sm:text-lg lg:text-xl font-medium">Genset Radar</span>
            <span className="status text-sm sm:text-base">{getStatusText(powerStatus.gensetRadar)}</span>
          </div>
        </div>
        
        <div className="w-full flex-grow flex items-center justify-center">
          <div className={`mt-2 sm:mt-4 p-3 sm:p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center text-gray-800 dark:text-gray-200 w-full max-w-lg text-xs sm:text-sm lg:text-base min-h-[60px] ${shouldDescriptionBlink() ? 'emergency-text-blink' : ''}`}>
            {powerStatus.description}
          </div>
        </div>
      </div>
    </div>
  );
}