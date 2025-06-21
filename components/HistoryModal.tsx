'use client';

import { useState, useEffect } from 'react';
import { getAllPowerStatus, getAllFuelLevels, getAllFuelRefills, getAllBatteryReplacements, getAllMaintenance, PowerStatus, FuelLevel, FuelRefill, BatteryReplacement, Maintenance, filterDataByDateRange, updatePowerStatus, deletePowerStatus, bulkDeletePowerStatus, updateFuelLevel, deleteFuelLevel, bulkDeleteFuelLevel, updateFuelRefill, deleteFuelRefill, bulkDeleteFuelRefill, updateBatteryReplacement, deleteBatteryReplacement, bulkDeleteBatteryReplacement, updateMaintenance, deleteMaintenance, bulkDeleteMaintenance } from '@/lib/firebaseService';
import { useAlert } from '@/hooks/use-alert';
import AlertPopup from '@/components/ui/alert-popup';
import EditModal from '@/components/EditModal';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetailClick: (id: string) => void;
}

export default function HistoryModal({ isOpen, onClose, onDetailClick }: HistoryModalProps) {
  const [activeTab, setActiveTab] = useState('power');
  const [dateFilter, setDateFilter] = useState<number | null>(null); // null = all data
  const [powerHistory, setPowerHistory] = useState<(PowerStatus & { id: string })[]>([]);
  const [fuelHistory, setFuelHistory] = useState<(FuelLevel & { id: string })[]>([]);
  const [refillHistory, setRefillHistory] = useState<(FuelRefill & { id: string })[]>([]);
  const [batteryHistory, setBatteryHistory] = useState<(BatteryReplacement & { id: string })[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<(Maintenance & { id: string })[]>([]);

  // Store original data for filtering
  const [originalPowerHistory, setOriginalPowerHistory] = useState<(PowerStatus & { id: string })[]>([]);
  const [originalFuelHistory, setOriginalFuelHistory] = useState<(FuelLevel & { id: string })[]>([]);
  const [originalRefillHistory, setOriginalRefillHistory] = useState<(FuelRefill & { id: string })[]>([]);
  const [originalBatteryHistory, setOriginalBatteryHistory] = useState<(BatteryReplacement & { id: string })[]>([]);
  const [originalMaintenanceHistory, setOriginalMaintenanceHistory] = useState<(Maintenance & { id: string })[]>([]);

  // Selection state for bulk operations
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Edit state
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { alert, showSuccess, showError, hideAlert } = useAlert();

  useEffect(() => {
    if (!isOpen) return;

    // Subscribe to power status history
    const unsubscribePower = getAllPowerStatus((statuses) => {
      setOriginalPowerHistory(statuses);
    });

    // Subscribe to fuel level history
    const unsubscribeFuel = getAllFuelLevels((levels) => {
      setOriginalFuelHistory(levels);
    });

    // Subscribe to fuel refill history
    const unsubscribeRefill = getAllFuelRefills((refills) => {
      setOriginalRefillHistory(refills);
    });

    // Subscribe to battery replacement history
    const unsubscribeBattery = getAllBatteryReplacements((replacements) => {
      setOriginalBatteryHistory(replacements);
    });

    // Subscribe to maintenance history
    const unsubscribeMaintenance = getAllMaintenance((maintenances) => {
      setOriginalMaintenanceHistory(maintenances);
    });

    return () => {
      unsubscribePower();
      unsubscribeFuel();
      unsubscribeRefill();
      unsubscribeBattery();
      unsubscribeMaintenance();
    };
  }, [isOpen]);

  // Apply date filter whenever original data or filter changes
  useEffect(() => {
    setPowerHistory(filterDataByDateRange(originalPowerHistory, dateFilter));
    setFuelHistory(filterDataByDateRange(originalFuelHistory, dateFilter));
    setRefillHistory(filterDataByDateRange(originalRefillHistory, dateFilter));
    setBatteryHistory(filterDataByDateRange(originalBatteryHistory, dateFilter));
    setMaintenanceHistory(filterDataByDateRange(originalMaintenanceHistory, dateFilter));
  }, [originalPowerHistory, originalFuelHistory, originalRefillHistory, originalBatteryHistory, originalMaintenanceHistory, dateFilter]);

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedItems(new Set());
    setIsSelectMode(false);
  }, [activeTab]);

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

  // Selection handlers
  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    const currentData = getCurrentData();
    if (selectedItems.size === currentData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentData.map(item => item.id)));
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'power': return powerHistory;
      case 'fuel': return fuelHistory;
      case 'refill': return refillHistory;
      case 'battery': return batteryHistory;
      case 'maintenance': return maintenanceHistory;
      default: return [];
    }
  };

  // CRUD operations
  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedData: any) => {
    try {
      switch (activeTab) {
        case 'power':
          await updatePowerStatus(editingItem.id, updatedData);
          break;
        case 'fuel':
          await updateFuelLevel(editingItem.id, updatedData);
          break;
        case 'refill':
          await updateFuelRefill(editingItem.id, updatedData);
          break;
        case 'battery':
          await updateBatteryReplacement(editingItem.id, updatedData);
          break;
        case 'maintenance':
          await updateMaintenance(editingItem.id, updatedData);
          break;
      }
      showSuccess('Berhasil!', 'Data berhasil diperbarui!');
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      showError('Gagal!', 'Gagal memperbarui data. Silakan coba lagi.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      switch (activeTab) {
        case 'power':
          await deletePowerStatus(id);
          break;
        case 'fuel':
          await deleteFuelLevel(id);
          break;
        case 'refill':
          await deleteFuelRefill(id);
          break;
        case 'battery':
          await deleteBatteryReplacement(id);
          break;
        case 'maintenance':
          await deleteMaintenance(id);
          break;
      }
      showSuccess('Berhasil!', 'Data berhasil dihapus!');
    } catch (error) {
      showError('Gagal!', 'Gagal menghapus data. Silakan coba lagi.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    try {
      const idsArray = Array.from(selectedItems);
      switch (activeTab) {
        case 'power':
          await bulkDeletePowerStatus(idsArray);
          break;
        case 'fuel':
          await bulkDeleteFuelLevel(idsArray);
          break;
        case 'refill':
          await bulkDeleteFuelRefill(idsArray);
          break;
        case 'battery':
          await bulkDeleteBatteryReplacement(idsArray);
          break;
        case 'maintenance':
          await bulkDeleteMaintenance(idsArray);
          break;
      }
      showSuccess('Berhasil!', `${selectedItems.size} data berhasil dihapus!`);
      setSelectedItems(new Set());
      setIsSelectMode(false);
    } catch (error) {
      showError('Gagal!', 'Gagal menghapus data. Silakan coba lagi.');
    }
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

  const getFilterSuffix = () => {
    if (dateFilter === null) return 'semua_data';
    if (dateFilter === 1) return '1_hari';
    if (dateFilter === 7) return '7_hari';
    if (dateFilter === 30) return '30_hari';
    return `${dateFilter}_hari`;
  };

  const handleDownloadData = () => {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    const filterSuffix = getFilterSuffix();

    if (activeTab === 'power') {
      const csvData = powerHistory.map(status => ({
        tanggal: formatDisplayDateTime(status.datetime),
        status_pln: status.pln === 1 ? 'Aktif' : 'Nonaktif',
        genset_135kva: status.genset_135 === 1 ? 'Aktif' : 'Nonaktif',
        genset_150kva: status.genset_150 === 1 ? 'Aktif' : 'Nonaktif',
        genset_radar: status.genset_radar === 1 ? 'Aktif' : 'Nonaktif'
      }));
      downloadCSV(csvData, `riwayat_status_listrik_${filterSuffix}_${timestamp}.csv`, 
        ['Tanggal', 'Status PLN', 'Genset 135kVA', 'Genset 150kVA', 'Genset Radar']);
    } else if (activeTab === 'fuel') {
      const csvData = fuelHistory.map(level => {
        // Handle new three tank format
        if (level.tangki_135kva !== undefined && level.tangki_150kva !== undefined && level.tangki_radar !== undefined) {
          return {
            tanggal: formatDisplayDateTime(level.datetime),
            tangki_135kva: `${level.tangki_135kva}%`,
            tangki_150kva: `${level.tangki_150kva}%`,
            tangki_radar: `${level.tangki_radar}%`,
            status_135kva: getFuelStatusText(level.tangki_135kva),
            status_150kva: getFuelStatusText(level.tangki_150kva),
            status_radar: getFuelStatusText(level.tangki_radar)
          };
        }
        // Handle old dual tank format
        else if (level.reservoir !== undefined && level.drum !== undefined) {
          return {
            tanggal: formatDisplayDateTime(level.datetime),
            tangki_135kva: `${level.reservoir}%`,
            tangki_150kva: `${level.drum}%`,
            tangki_radar: 'N/A',
            status_135kva: getFuelStatusText(level.reservoir),
            status_150kva: getFuelStatusText(level.drum),
            status_radar: 'N/A'
          };
        }
        // Handle old single level format
        else {
          return {
            tanggal: formatDisplayDateTime(level.datetime),
            tangki_135kva: level.level ? `${level.level}%` : 'N/A',
            tangki_150kva: 'N/A',
            tangki_radar: 'N/A',
            status_135kva: level.level ? getFuelStatusText(level.level) : 'N/A',
            status_150kva: 'N/A',
            status_radar: 'N/A'
          };
        }
      });
      downloadCSV(csvData, `riwayat_level_minyak_${filterSuffix}_${timestamp}.csv`, 
        ['Tanggal', 'Tangki 135kVA', 'Tangki 150kVA', 'Tangki Radar', 'Status 135kVA', 'Status 150kVA', 'Status Radar']);
    } else if (activeTab === 'refill') {
      const csvData = refillHistory.map(refill => ({
        tanggal: refill.date,
        waktu: refill.time,
        jumlah_liter: refill.amount,
        nama_petugas: refill.technician || 'N/A'
      }));
      downloadCSV(csvData, `riwayat_pengisian_minyak_${filterSuffix}_${timestamp}.csv`, 
        ['Tanggal', 'Waktu', 'Jumlah Liter', 'Nama Petugas']);
    } else if (activeTab === 'battery') {
      const csvData = batteryHistory.map(battery => ({
        tanggal: battery.date,
        waktu: battery.time,
        tipe_baterai: battery.battery_type,
        catatan: battery.notes,
        nama_petugas: battery.technician || 'N/A'
      }));
      downloadCSV(csvData, `riwayat_penggantian_baterai_${filterSuffix}_${timestamp}.csv`, 
        ['Tanggal', 'Waktu', 'Tipe Baterai', 'Catatan', 'Nama Petugas']);
    } else if (activeTab === 'maintenance') {
      const csvData = maintenanceHistory.map(maintenance => ({
        tanggal: maintenance.date,
        waktu: maintenance.time,
        catatan: maintenance.note,
        nama_petugas: maintenance.technician || 'N/A'
      }));
      downloadCSV(csvData, `riwayat_maintenance_${filterSuffix}_${timestamp}.csv`, 
        ['Tanggal', 'Waktu', 'Catatan', 'Nama Petugas']);
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
      case 'battery': return 'Penggantian Baterai';
      case 'maintenance': return 'Maintenance';
      default: return 'Data';
    }
  };

  const getDataCount = () => {
    switch (activeTab) {
      case 'power': return powerHistory.length;
      case 'fuel': return fuelHistory.length;
      case 'refill': return refillHistory.length;
      case 'battery': return batteryHistory.length;
      case 'maintenance': return maintenanceHistory.length;
      default: return 0;
    }
  };

  const getFilterButtonClass = (filterValue: number | null) => {
    const isActive = dateFilter === filterValue;
    return `px-2 sm:px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
      isActive 
        ? 'bg-blue-500 text-white shadow-lg' 
        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
    }`;
  };

  const renderActionButtons = (item: any) => (
    <div className="flex items-center space-x-1 sm:space-x-2">
      {isSelectMode ? (
        <input
          type="checkbox"
          checked={selectedItems.has(item.id)}
          onChange={() => handleSelectItem(item.id)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
      ) : (
        <>
          {activeTab === 'power' && (
            <button 
              onClick={() => handleDetailClick(item.id)}
              className="detail-btn px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center font-medium"
            >
              <i className="fas fa-info-circle mr-1"></i> 
              <span className="hidden sm:inline">Detail</span>
            </button>
          )}
          <button 
            onClick={() => handleEdit(item)}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-yellow-500 text-white text-xs rounded-lg hover:bg-yellow-600 transition-all flex items-center justify-center font-medium"
          >
            <i className="fas fa-edit mr-1"></i>
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button 
            onClick={() => handleDelete(item.id)}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-all flex items-center justify-center font-medium"
          >
            <i className="fas fa-trash mr-1"></i>
            <span className="hidden sm:inline">Hapus</span>
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={handleBackdropClick}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] mx-4 flex flex-col overflow-hidden">
          {/* Modal Header with gradient */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 sm:p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg sm:text-xl font-bold">Riwayat Status</h3>
                <p className="text-emerald-100 text-sm mt-1">Data historis sistem monitoring</p>
              </div>
              <div className="flex space-x-2 sm:space-x-3">
                {isSelectMode && selectedItems.size > 0 && (
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center px-3 sm:px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 transition-all text-white font-medium text-sm"
                    title="Hapus yang dipilih"
                  >
                    <i className="fas fa-trash mr-2"></i>
                    <span className="hidden sm:inline">Hapus ({selectedItems.size})</span>
                    <span className="sm:hidden">{selectedItems.size}</span>
                  </button>
                )}
                <button 
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className={`flex items-center px-3 sm:px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                    isSelectMode 
                      ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                      : 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
                  }`}
                  title={isSelectMode ? 'Keluar mode pilih' : 'Mode pilih'}
                >
                  <i className={`fas ${isSelectMode ? 'fa-times' : 'fa-check-square'} mr-2`}></i>
                  <span className="hidden sm:inline">{isSelectMode ? 'Batal' : 'Pilih'}</span>
                </button>
                <button 
                  onClick={handleDownloadData}
                  className="flex items-center px-3 sm:px-4 py-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all text-white font-medium text-sm"
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
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2 mb-4">
              <button 
                onClick={() => setActiveTab('power')}
                className={`px-3 sm:px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  activeTab === 'power' 
                    ? 'bg-emerald-500 text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <i className="fas fa-bolt mr-2"></i>
                <span className="hidden sm:inline">Status Sumber Listrik</span>
                <span className="sm:hidden">Listrik</span>
              </button>
              <button 
                onClick={() => setActiveTab('fuel')}
                className={`px-3 sm:px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  activeTab === 'fuel' 
                    ? 'bg-emerald-500 text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <i className="fas fa-gas-pump mr-2"></i>
                <span className="hidden sm:inline">Level Minyak</span>
                <span className="sm:hidden">Minyak</span>
              </button>
              <button 
                onClick={() => setActiveTab('refill')}
                className={`px-3 sm:px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  activeTab === 'refill' 
                    ? 'bg-emerald-500 text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <i className="fas fa-plus-circle mr-2"></i>
                <span className="hidden sm:inline">Pengisian Minyak</span>
                <span className="sm:hidden">Pengisian</span>
              </button>
              <button 
                onClick={() => setActiveTab('battery')}
                className={`px-3 sm:px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  activeTab === 'battery' 
                    ? 'bg-emerald-500 text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <i className="fas fa-battery-full mr-2"></i>
                <span className="hidden sm:inline">Penggantian Baterai</span>
                <span className="sm:hidden">Baterai</span>
              </button>
              <button 
                onClick={() => setActiveTab('maintenance')}
                className={`px-3 sm:px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  activeTab === 'maintenance' 
                    ? 'bg-emerald-500 text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <i className="fas fa-tools mr-2"></i>
                <span className="hidden sm:inline">Maintenance</span>
                <span className="sm:hidden">Maintenance</span>
              </button>
            </div>

            {/* Date Filter and Bulk Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                  <i className="fas fa-filter mr-1"></i>
                  Filter:
                </span>
                <button 
                  onClick={() => setDateFilter(1)}
                  className={getFilterButtonClass(1)}
                >
                  1 Hari
                </button>
                <button 
                  onClick={() => setDateFilter(7)}
                  className={getFilterButtonClass(7)}
                >
                  7 Hari
                </button>
                <button 
                  onClick={() => setDateFilter(30)}
                  className={getFilterButtonClass(30)}
                >
                  30 Hari
                </button>
                <button 
                  onClick={() => setDateFilter(null)}
                  className={getFilterButtonClass(null)}
                >
                  Semua Data
                </button>
              </div>

              {isSelectMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                  >
                    {selectedItems.size === getCurrentData().length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Modal Content - Always maintain table structure */}
          <div className="overflow-auto flex-grow p-4 sm:p-6">
            {/* Power Status History Table */}
            {activeTab === 'power' && (
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                      <tr>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">PLN</th>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">135kVA</th>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">150kVA</th>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Radar</th>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {powerHistory.map((status) => (
                        <tr key={status.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-2 sm:px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {formatDisplayDateTime(status.datetime)}
                          </td>
                          <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                            <span className={getStatusBadge(status.pln, 'pln')}>
                              {status.pln === 1 ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                            <span className={getStatusBadge(status.genset_135, 'genset')}>
                              {status.genset_135 === 1 ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                            <span className={getStatusBadge(status.genset_150, 'genset')}>
                              {status.genset_150 === 1 ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                            <span className={getStatusBadge(status.genset_radar, 'genset')}>
                              {status.genset_radar === 1 ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                            {renderActionButtons(status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Fuel Level History Table - Enhanced for Three Tanks */}
            {activeTab === 'fuel' && (
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                      <tr>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          <i className="fas fa-gas-pump mr-1"></i>
                          Tangki 135
                        </th>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          <i className="fas fa-gas-pump mr-1"></i>
                          Tangki 150
                        </th>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          <i className="fas fa-gas-pump mr-1"></i>
                          Tangki Radar
                        </th>
                        <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {fuelHistory.map((level) => {
                        // Handle new three tank format
                        let tangki135Level = 0, tangki150Level = 0, tangkiRadarLevel = 0;
                        
                        if (level.tangki_135kva !== undefined && level.tangki_150kva !== undefined && level.tangki_radar !== undefined) {
                          tangki135Level = level.tangki_135kva;
                          tangki150Level = level.tangki_150kva;
                          tangkiRadarLevel = level.tangki_radar;
                        }
                        // Handle old dual tank format
                        else if (level.reservoir !== undefined && level.drum !== undefined) {
                          tangki135Level = level.reservoir;
                          tangki150Level = level.drum;
                          tangkiRadarLevel = Math.max(0, (level.reservoir + level.drum) / 2);
                        }
                        // Handle old single level format
                        else if (level.level !== undefined) {
                          tangki135Level = level.level;
                          tangki150Level = Math.max(0, level.level - 10);
                          tangkiRadarLevel = Math.max(0, level.level - 5);
                        }
                        
                        return (
                          <tr key={level.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-2 sm:px-3 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {formatDisplayDateTime(level.datetime)}
                            </td>
                            <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {tangki135Level}%
                                </span>
                                <span className={getFuelStatusBadge(tangki135Level)}>
                                  {getFuelStatusText(tangki135Level)}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {tangki150Level}%
                                </span>
                                <span className={getFuelStatusBadge(tangki150Level)}>
                                  {getFuelStatusText(tangki150Level)}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {tangkiRadarLevel}%
                                </span>
                                <span className={getFuelStatusBadge(tangkiRadarLevel)}>
                                  {getFuelStatusText(tangkiRadarLevel)}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                              {renderActionButtons(level)}
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
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Waktu</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Jumlah (L)</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Petugas</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {refillHistory.map((refill) => (
                        <tr key={refill.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {refill.date}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {refill.time}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {refill.amount} L
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                            {refill.technician || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            {renderActionButtons(refill)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Battery Replacement History Table */}
            {activeTab === 'battery' && (
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Waktu</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Tipe Baterai</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Catatan</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Petugas</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {batteryHistory.map((battery) => (
                        <tr key={battery.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {battery.date}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {battery.time}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {battery.battery_type}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 dark:text-white max-w-xs truncate">
                            {battery.notes}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                            {battery.technician || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            {renderActionButtons(battery)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Maintenance History Table */}
            {activeTab === 'maintenance' && (
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Waktu</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Catatan Maintenance</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Petugas</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {maintenanceHistory.map((maintenance) => (
                        <tr key={maintenance.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {maintenance.date}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {maintenance.time}
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 dark:text-white max-w-md">
                            <div className="break-words">
                              {maintenance.note}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                            {maintenance.technician || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            {renderActionButtons(maintenance)}
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
          <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <i className="fas fa-info-circle mr-1"></i>
              Total data: {getDataCount()} entri
              {dateFilter && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  (Filter: {dateFilter === 1 ? '1 hari' : dateFilter === 7 ? '7 hari' : '30 hari'})
                </span>
              )}
              {selectedItems.size > 0 && (
                <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                  • {selectedItems.size} dipilih
                </span>
              )}
            </div>
            <button 
              onClick={onClose}
              className="px-4 sm:px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        editingItem={editingItem}
        dataType={activeTab as 'power' | 'fuel' | 'refill' | 'battery' | 'maintenance'}
      />

      {/* Custom Alert Popup */}
      <AlertPopup
        isOpen={alert.isOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={hideAlert}
        autoClose={alert.autoClose}
        autoCloseDelay={alert.autoCloseDelay}
      />
    </>
  );
}