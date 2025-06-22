'use client';

import { useState, useEffect } from 'react';
import { getAllPowerStatus, PowerStatus } from '@/lib/firebaseService';

interface DetailStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  detailId: string;
}

export default function DetailStatusModal({ isOpen, onClose, detailId }: DetailStatusModalProps) {
  const [detailData, setDetailData] = useState<PowerStatus | null>(null);

  useEffect(() => {
    if (!isOpen || !detailId) return;

    const unsubscribe = getAllPowerStatus((statuses) => {
      const foundStatus = statuses.find(status => status.id === detailId);
      if (foundStatus) {
        setDetailData(foundStatus);
      }
    });

    return unsubscribe;
  }, [isOpen, detailId]);

  // Handle click outside modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

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

  const getStatusBadge = (status: number) => {
    if (status === 1) {
      return 'px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-sm font-medium';
    } else {
      return 'px-3 py-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-sm font-medium';
    }
  };

  const getStatusText = (status: number) => status === 1 ? 'Aktif' : 'Nonaktif';

  if (!detailData) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
          <div className="p-6 sm:p-8 text-center">
            <i className="fas fa-spinner fa-spin text-2xl sm:text-3xl text-emerald-500 mb-4"></i>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-md mx-4 overflow-hidden">
        {/* Modal Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 sm:p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Detail Status</h3>
              <p className="text-emerald-100 text-sm mt-1">Informasi lengkap status sistem</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-emerald-200 focus:outline-none transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>
        
        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 modal-content">
          <div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              <i className="fas fa-calendar-alt mr-2 text-emerald-500"></i>
              Tanggal & Waktu
            </h4>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              {formatDisplayDateTime(detailData.datetime)}
            </p>
          </div>
          
          <div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              <i className="fas fa-bolt mr-2 text-emerald-500"></i>
              Status Sumber Listrik
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">PLN:</span>
                <span className={getStatusBadge(detailData.pln)}>{getStatusText(detailData.pln)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">Genset 135kVA:</span>
                <span className={getStatusBadge(detailData.genset_135)}>{getStatusText(detailData.genset_135)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">Genset 150kVA:</span>
                <span className={getStatusBadge(detailData.genset_150)}>{getStatusText(detailData.genset_150)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">Genset Radar:</span>
                <span className={getStatusBadge(detailData.genset_radar)}>{getStatusText(detailData.genset_radar)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              <i className="fas fa-info-circle mr-2 text-emerald-500"></i>
              Keterangan
            </h4>
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 p-4 rounded-lg border-l-4 border-emerald-500">
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                {generateDescription(detailData.pln, detailData.genset_135, detailData.genset_150, detailData.genset_radar)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 sm:px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all font-medium text-sm sm:text-base"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}