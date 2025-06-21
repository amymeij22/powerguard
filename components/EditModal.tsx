'use client';

import { useState, useEffect } from 'react';
import { PowerStatus, FuelLevel, FuelRefill, BatteryReplacement, Maintenance } from '@/lib/firebaseService';
import { useAlert } from '@/hooks/use-alert';
import AlertPopup from '@/components/ui/alert-popup';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingItem: any;
  dataType: 'power' | 'fuel' | 'refill' | 'battery' | 'maintenance';
}

export default function EditModal({ isOpen, onClose, onSave, editingItem, dataType }: EditModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { alert, showError, hideAlert } = useAlert();

  useEffect(() => {
    if (editingItem && isOpen) {
      setFormData({ ...editingItem });
    }
  }, [editingItem, isOpen]);

  if (!isOpen || !editingItem) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate based on data type
      if (dataType === 'power') {
        // Validate power status data
        const powerData = {
          pln: parseInt(formData.pln),
          genset_135: parseInt(formData.genset_135),
          genset_150: parseInt(formData.genset_150),
          genset_radar: parseInt(formData.genset_radar),
          datetime: formData.datetime
        };
        await onSave(powerData);
      } else if (dataType === 'fuel') {
        // Validate fuel level data
        const fuelData: any = {
          datetime: formData.datetime
        };
        
        // Handle different fuel level formats
        if (formData.tangki_135kva !== undefined) {
          fuelData.tangki_135kva = parseFloat(formData.tangki_135kva);
          fuelData.tangki_150kva = parseFloat(formData.tangki_150kva);
          fuelData.tangki_radar = parseFloat(formData.tangki_radar);
        } else if (formData.reservoir !== undefined) {
          fuelData.reservoir = parseFloat(formData.reservoir);
          fuelData.drum = parseFloat(formData.drum);
        } else if (formData.level !== undefined) {
          fuelData.level = parseFloat(formData.level);
        }
        
        await onSave(fuelData);
      } else if (dataType === 'refill') {
        // Validate refill data
        const amount = parseFloat(formData.amount.toString().replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
          showError('Input Tidak Valid', 'Jumlah minyak harus berupa angka yang valid dan lebih dari 0');
          setIsSubmitting(false);
          return;
        }

        const refillData = {
          date: formData.date,
          time: formData.time,
          amount: amount,
          technician: formData.technician
        };
        await onSave(refillData);
      } else if (dataType === 'battery') {
        // Validate battery data
        const batteryData = {
          date: formData.date,
          time: formData.time,
          battery_type: formData.battery_type,
          notes: formData.notes,
          technician: formData.technician
        };
        await onSave(batteryData);
      } else if (dataType === 'maintenance') {
        // Validate maintenance data
        const maintenanceData = {
          date: formData.date,
          time: formData.time,
          note: formData.note,
          technician: formData.technician
        };
        await onSave(maintenanceData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving data:', error);
      showError('Gagal Menyimpan', 'Gagal menyimpan perubahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const getModalTitle = () => {
    switch (dataType) {
      case 'power': return 'Edit Status Sumber Listrik';
      case 'fuel': return 'Edit Level Minyak';
      case 'refill': return 'Edit Data Pengisian Minyak';
      case 'battery': return 'Edit Penggantian Baterai';
      case 'maintenance': return 'Edit Maintenance';
      default: return 'Edit Data';
    }
  };

  const renderFormFields = () => {
    switch (dataType) {
      case 'power':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-plug mr-2 text-emerald-500"></i>
                  Status PLN
                </label>
                <select
                  name="pln"
                  value={formData.pln || 0}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                >
                  <option value={0}>Nonaktif</option>
                  <option value={1}>Aktif</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-bolt mr-2 text-emerald-500"></i>
                  Genset 135kVA
                </label>
                <select
                  name="genset_135"
                  value={formData.genset_135 || 0}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                >
                  <option value={0}>Nonaktif</option>
                  <option value={1}>Aktif</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-bolt mr-2 text-emerald-500"></i>
                  Genset 150kVA
                </label>
                <select
                  name="genset_150"
                  value={formData.genset_150 || 0}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                >
                  <option value={0}>Nonaktif</option>
                  <option value={1}>Aktif</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-bolt mr-2 text-emerald-500"></i>
                  Genset Radar
                </label>
                <select
                  name="genset_radar"
                  value={formData.genset_radar || 0}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                >
                  <option value={0}>Nonaktif</option>
                  <option value={1}>Aktif</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-calendar-alt mr-2 text-emerald-500 dark:text-white"></i>
                Tanggal & Waktu
              </label>
              <input
                type="text"
                name="datetime"
                value={formData.datetime || ''}
                onChange={handleInputChange}
                placeholder="dd/mm/yyyy hh:mm:ss"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                required
              />
            </div>
          </div>
        );

      case 'fuel':
        return (
          <div className="space-y-4">
            {formData.tangki_135kva !== undefined ? (
              // Three tank format
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <i className="fas fa-gas-pump mr-2 text-emerald-500"></i>
                    Tangki 135kVA (%)
                  </label>
                  <input
                    type="number"
                    name="tangki_135kva"
                    value={formData.tangki_135kva || 0}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <i className="fas fa-gas-pump mr-2 text-emerald-500"></i>
                    Tangki 150kVA (%)
                  </label>
                  <input
                    type="number"
                    name="tangki_150kva"
                    value={formData.tangki_150kva || 0}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <i className="fas fa-gas-pump mr-2 text-emerald-500"></i>
                    Tangki Radar (%)
                  </label>
                  <input
                    type="number"
                    name="tangki_radar"
                    value={formData.tangki_radar || 0}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                    required
                  />
                </div>
              </div>
            ) : formData.reservoir !== undefined ? (
              // Dual tank format
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <i className="fas fa-gas-pump mr-2 text-emerald-500"></i>
                    Reservoir (%)
                  </label>
                  <input
                    type="number"
                    name="reservoir"
                    value={formData.reservoir || 0}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <i className="fas fa-gas-pump mr-2 text-emerald-500"></i>
                    Drum (%)
                  </label>
                  <input
                    type="number"
                    name="drum"
                    value={formData.drum || 0}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                    required
                  />
                </div>
              </div>
            ) : (
              // Single level format
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-gas-pump mr-2 text-emerald-500"></i>
                  Level (%)
                </label>
                <input
                  type="number"
                  name="level"
                  value={formData.level || 0}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-calendar-alt mr-2 text-emerald-500 dark:text-white"></i>
                Tanggal & Waktu
              </label>
              <input
                type="text"
                name="datetime"
                value={formData.datetime || ''}
                onChange={handleInputChange}
                placeholder="dd/mm/yyyy hh:mm:ss"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                required
              />
            </div>
          </div>
        );

      case 'refill':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-calendar-alt mr-2 text-emerald-500 dark:text-white"></i>
                  Tanggal
                </label>
                <input
                  type="text"
                  name="date"
                  value={formData.date || ''}
                  onChange={handleInputChange}
                  placeholder="dd/mm/yyyy"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-clock mr-2 text-emerald-500 dark:text-white"></i>
                  Waktu
                </label>
                <input
                  type="text"
                  name="time"
                  value={formData.time || ''}
                  onChange={handleInputChange}
                  placeholder="hh:mm:ss"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-gas-pump mr-2 text-emerald-500"></i>
                Jumlah Minyak (Liter)
              </label>
              <input
                type="text"
                name="amount"
                value={formData.amount || ''}
                onChange={handleInputChange}
                placeholder="Contoh: 25.5 atau 25,5"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-user mr-2 text-emerald-500"></i>
                Nama Petugas
              </label>
              <input
                type="text"
                name="technician"
                value={formData.technician || ''}
                onChange={handleInputChange}
                placeholder="Masukkan nama petugas"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                required
              />
            </div>
          </div>
        
        );

      case 'battery':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-calendar-alt mr-2 text-emerald-500 dark:text-white"></i>
                  Tanggal
                </label>
                <input
                  type="text"
                  name="date"
                  value={formData.date || ''}
                  onChange={handleInputChange}
                  placeholder="dd/mm/yyyy"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-clock mr-2 text-emerald-500 dark:text-white"></i>
                  Waktu
                </label>
                <input
                  type="text"
                  name="time"
                  value={formData.time || ''}
                  onChange={handleInputChange}
                  placeholder="hh:mm:ss"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-battery-full mr-2 text-emerald-500"></i>
                Tipe Baterai
              </label>
              <input
                type="text"
                name="battery_type"
                value={formData.battery_type || ''}
                onChange={handleInputChange}
                placeholder="Masukkan tipe baterai"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-sticky-note mr-2 text-emerald-500"></i>
                Catatan
              </label>
              <textarea
                name="notes"
                value={formData.notes || ''}
                onChange={handleInputChange}
                placeholder="Tambahkan catatan penggantian baterai"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white min-h-[80px] text-sm sm:text-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-user mr-2 text-emerald-500"></i>
                Nama Petugas
              </label>
              <input
                type="text"
                name="technician"
                value={formData.technician || ''}
                onChange={handleInputChange}
                placeholder="Masukkan nama petugas"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                required
              />
            </div>
          </div>
        );

      case 'maintenance':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-calendar-alt mr-2 text-emerald-500 dark:text-white"></i>
                  Tanggal
                </label>
                <input
                  type="text"
                  name="date"
                  value={formData.date || ''}
                  onChange={handleInputChange}
                  placeholder="dd/mm/yyyy"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <i className="fas fa-clock mr-2 text-emerald-500 dark:text-white"></i>
                  Waktu
                </label>
                <input
                  type="text"
                  name="time"
                  value={formData.time || ''}
                  onChange={handleInputChange}
                  placeholder="hh:mm:ss"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-tools mr-2 text-emerald-500"></i>
                Catatan Maintenance
              </label>
              <textarea
                name="note"
                value={formData.note || ''}
                onChange={handleInputChange}
                placeholder="Masukkan detail maintenance yang dilakukan"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-user mr-2 text-emerald-500"></i>
                Nama Petugas
              </label>
              <input
                type="text"
                name="technician"
                value={formData.technician || ''}
                onChange={handleInputChange}
                placeholder="Masukkan nama petugas"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                required
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Edit Modal with higher z-index than History Modal (z-50) */}
      <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-[90vw] lg:max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 sm:p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg sm:text-xl font-bold">{getModalTitle()}</h3>
                <p className="text-yellow-100 text-sm mt-1">Ubah informasi data</p>
              </div>
              <button 
                onClick={onClose}
                disabled={isSubmitting}
                className="text-white hover:text-yellow-200 focus:outline-none disabled:opacity-50 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
          
          {/* Modal Content */}
          <div className="overflow-auto flex-grow p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {renderFormFields()}
              
              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 font-medium disabled:opacity-50 text-sm sm:text-base"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 font-medium disabled:opacity-50 flex items-center justify-center shadow-lg text-sm sm:text-base"
                >
                  {isSubmitting && <i className="fas fa-spinner fa-spin mr-2"></i>}
                  <i className={`fas ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Custom Alert Popup with even higher z-index */}
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