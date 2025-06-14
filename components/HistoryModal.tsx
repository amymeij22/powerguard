'use client';

import { useState, useEffect } from 'react';
import { getAllPowerStatus, getAllFuelLevels, getAllFuelRefills, PowerStatus, FuelLevel, FuelRefill } from '@/lib/firebaseService';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetailClick: (id: string) => void;
}

export default function HistoryModal({ isOpen, onClose, onDetailClick }: HistoryModalProps) {
  const [activeTab, setActiveTab] = useState('power');
  const [powerHistory, setPowerHistory] = useState<(PowerStatus & { id: string })[]>([]);
  const [fuelHistory, setFuelHistory] = useState<(FuelLevel & { id: string })[]>([]);
  const [refillHistory, setRefillHistory] = useState<(FuelRefill & { id: string })[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Subscribe to power status history
    const unsubscribePower = getAllPowerStatus((statuses) => {
      setPowerHistory(statuses);
    });

    // Subscribe to fuel level history
    const unsubscribeFuel = getAllFuelLevels((levels) => {
      setFuelHistory(levels);
    });

    // Subscribe to fuel refill history
    const unsubscribeRefill = getAllFuelRefills((refills) => {
      setRefillHistory(refills);
    });

    return () => {
      unsubscribePower();
      unsubscribeFuel();
      unsubscribeRefill();
    };
  }, [isOpen]);

  // Handle click outside modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const handleDetailClick = (id: string) => {
    onDetailClick(id);
  };

  // CSV Download Functions
  const downloadCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header.toLowerCase().replace(/\s+/g, '_')] || '';
        return `"${value}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadData = () => {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];

    if (activeTab === 'power') {
      const csvData = powerHistory.map(status => ({
        tanggal: formatDisplayDateTime(status.datetime),
        status_pln: status.pln === 1 ? 'Aktif' : 'Nonaktif',
        genset_135kva: status.genset_135 === 1 ? 'Aktif' : 'Nonaktif',
        genset_150kva: status.genset_150 === 1 ? 'Aktif' : 'Nonaktif',
        genset_radar: status.genset_radar === 1 ? 'Aktif' : 'Nonaktif'
      }));
      downloadCSV(csvData, `riwayat_status_listrik_${timestamp}.csv`, 
        ['Tanggal', 'Status PLN', 'Genset 135kVA', 'Genset 150kVA', 'Genset Radar']);
    } else if (activeTab === 'fuel') {
      const csvData = fuelHistory.map(level => {
        // Handle both old and new format
        if (level.reservoir !== undefined && level.drum !== undefined) {
          // New dual tank format
          return {
            tanggal: formatDisplayDateTime(level.datetime),
            tangki_reservoir: `${level.reservoir}%`,
            tangki_utama: `${level.drum}%`,
            status_reservoir: getFuelStatusText(level.reservoir),
            status_utama: getFuelStatusText(level.drum),
            status_keseluruhan: getFuelStatusText(Math.min(level.reservoir, level.drum))
          };
        } else {
          // Old single level format
          return {
            tanggal: formatDisplayDateTime(level.datetime),
            tangki_reservoir: level.level ? `${level.level}%` : 'N/A',
            tangki_utama: 'N/A',
            status_reservoir: level.level ? getFuelStatusText(level.level) : 'N/A',
            status_utama: 'N/A',
            status_keseluruhan: level.level ? getFuelStatusText(level.level) : 'N/A'
          };
        }
      });
      downloadCSV(csvData, `riwayat_level_minyak_${timestamp}.csv`, 
        ['Tanggal', 'Tangki Reservoir', 'Tangki Utama', 'Status Reservoir', 'Status Utama', 'Status Keseluruhan']);
    } else if (activeTab === 'refill') {
      const csvData = refillHistory.map(refill => ({
        tanggal: refill.date,
        waktu: refill.time,
        jumlah_liter: refill.amount
      }));
      downloadCSV(csvData, `riwayat_pengisian_minyak_${timestamp}.csv`, 
        ['Tanggal', 'Waktu', 'Jumlah Liter']);
    }
  };

  const formatDisplayDateTime = (datetime: string) => {
    try {
      const [datePart, timePart] = datetime.split(' ');
      const [day, month, year] = datePart.split('/');
      const [hours, minutes] = timePart.split(':');
      
      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch (error) {
      return datetime;
    }
  };

  const getStatusBadge = (status: number, type: 'pln' | 'genset') => {
    if (status === 1) {
      const colorClass = type === 'pln' ? 'text-pln' : 'text-genset';
      return `px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 ${colorClass} dark:bg-green-900`;
    } else {
      return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-danger dark:bg-red-900';
    }
  };

  const getFuelStatusBadge = (level: number) => {
    if (level >= 70) {
      return 'px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    } else if (level >= 40) {
      return 'px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    } else if (level >= 20) {
      return 'px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    } else {
      return 'px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    }
  };

  const getFuelStatusText = (level: number) => {
    if (level >= 70) return 'Normal';
    if (level >= 40) return 'Sedang';
    if (level >= 20) return 'Rendah';
    return 'Kritis';
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'power': return 'Status Sumber Listrik';
      case 'fuel': return 'Level Minyak';
      case 'refill': return 'Pengisian Minyak';
      default: return 'Data';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={handleBackdropClick}>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] mx-4 flex flex-col overflow-hidden">
        {/* Modal Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">Riwayat Status</h3>
              <p className="text-emerald-100 text-sm mt-1">Data historis sistem monitoring</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleDownloadData}
                className="flex items-center px-4 py-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all text-white font-medium"
                title={`Unduh data ${getTabTitle()}`}
              >
                <i className="fas fa-download mr-2"></i>
                <span className="hidden sm:inline">Unduh CSV</span>
              </button>
              <button 
                onClick={onClose}
                className="text-white hover:text-emerald-200 focus:outline-none transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
        </div>
        
        {/* History Type Selector */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setActiveTab('power')}
              className={`px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                activeTab === 'power' 
                  ? 'bg-emerald-500 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-bolt mr-2"></i>
              Status Sumber Listrik
            </button>
            <button 
              onClick={() => setActiveTab('fuel')}
              className={`px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                activeTab === 'fuel' 
                  ? 'bg-emerald-500 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-gas-pump mr-2"></i>
              Level Minyak
            </button>
            <button 
              onClick={() => setActiveTab('refill')}
              className={`px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                activeTab === 'refill' 
                  ? 'bg-emerald-500 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <i className="fas fa-plus-circle mr-2"></i>
              Pengisian Minyak
            </button>
          </div>
        </div>
        
        {/* Modal Content - Always maintain table structure */}
        <div className="overflow-auto flex-grow p-6">
          {/* Power Status History Table */}
          {activeTab === 'power' && (
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status PLN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Genset 135kVA</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Genset 150kVA</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Genset Radar</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {powerHistory.map((status) => (
                      <tr key={status.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDisplayDateTime(status.datetime)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={getStatusBadge(status.pln, 'pln')}>
                            {status.pln === 1 ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={getStatusBadge(status.genset_135, 'genset')}>
                            {status.genset_135 === 1 ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={getStatusBadge(status.genset_150, 'genset')}>
                            {status.genset_150 === 1 ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={getStatusBadge(status.genset_radar, 'genset')}>
                            {status.genset_radar === 1 ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <button 
                            onClick={() => handleDetailClick(status.id)}
                            className="detail-btn px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center font-medium"
                          >
                            <i className="fas fa-info-circle mr-1"></i> Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fuel Level History Table - Enhanced for Dual Tank */}
          {activeTab === 'fuel' && (
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        <i className="fas fa-gas-pump mr-1"></i>
                        Tangki Reservoir
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        <i className="fas fa-oil-can mr-1"></i>
                        Tangki Utama
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status Keseluruhan</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {fuelHistory.map((level) => {
                      // Handle both old and new format
                      const reservoirLevel = level.reservoir !== undefined ? level.reservoir : (level.level || 0);
                      const drumLevel = level.drum !== undefined ? level.drum : (level.level ? Math.max(0, level.level - 10) : 0);
                      const overallStatus = Math.min(reservoirLevel, drumLevel);
                      
                      return (
                        <tr key={level.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDisplayDateTime(level.datetime)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {reservoirLevel}%
                              </span>
                              <span className={getFuelStatusBadge(reservoirLevel)}>
                                {getFuelStatusText(reservoirLevel)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {drumLevel}%
                              </span>
                              <span className={getFuelStatusBadge(drumLevel)}>
                                {getFuelStatusText(drumLevel)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {overallStatus}%
                              </span>
                              <span className={getFuelStatusBadge(overallStatus)}>
                                {getFuelStatusText(overallStatus)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fuel Refill History Table */}
          {activeTab === 'refill' && (
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Waktu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Jumlah (Liter)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {refillHistory.map((refill) => (
                      <tr key={refill.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {refill.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {refill.time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {refill.amount} L
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Modal Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-info-circle mr-1"></i>
            Total data: {
              activeTab === 'power' ? powerHistory.length :
              activeTab === 'fuel' ? fuelHistory.length :
              refillHistory.length
            } entri
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}