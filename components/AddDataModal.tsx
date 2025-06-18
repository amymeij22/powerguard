'use client';

import { useState } from 'react';
import { addFuelRefill, addBatteryReplacement, addMaintenance, formatDate, formatTime } from '@/lib/firebaseService';
import { useAlert } from '@/hooks/use-alert';
import AlertPopup from '@/components/ui/alert-popup';

interface AddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddDataModal({ isOpen, onClose }: AddDataModalProps) {
  const [activeTab, setActiveTab] = useState('fuel');
  const [fuelFormData, setFuelFormData] = useState({
    date: '',
    time: '',
    amount: ''
  });
  const [batteryFormData, setBatteryFormData] = useState({
    date: '',
    time: '',
    battery_type: '',
    notes: ''
  });
  const [maintenanceFormData, setMaintenanceFormData] = useState({
    date: '',
    time: '',
    note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { alert, showSuccess, showError, hideAlert } = useAlert();

  // Handle click outside modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert amount to number and validate
      const amount = parseFloat(fuelFormData.amount.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        showError('Input Tidak Valid', 'Jumlah minyak harus berupa angka yang valid dan lebih dari 0');
        setIsSubmitting(false);
        return;
      }

      // Convert date format from yyyy-mm-dd to dd/mm/yyyy
      const [year, month, day] = fuelFormData.date.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      // Add seconds to time format
      const formattedTime = `${fuelFormData.time}:00`;

      await addFuelRefill({
        date: formattedDate,
        time: formattedTime,
        amount: amount
      });

      // Reset form and close modal
      setFuelFormData({ date: '', time: '', amount: '' });
      showSuccess('Berhasil!', 'Data pengisian minyak berhasil ditambahkan!', true);
      setTimeout(() => handleClose(), 1500);
    } catch (error) {
      console.error('Error adding fuel refill:', error);
      showError('Gagal Menyimpan', 'Gagal menambahkan data pengisian minyak. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatterySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert date format from yyyy-mm-dd to dd/mm/yyyy
      const [year, month, day] = batteryFormData.date.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      // Add seconds to time format
      const formattedTime = `${batteryFormData.time}:00`;

      await addBatteryReplacement({
        date: formattedDate,
        time: formattedTime,
        battery_type: batteryFormData.battery_type,
        notes: batteryFormData.notes
      });

      // Reset form
      setBatteryFormData({ date: '', time: '', battery_type: '', notes: '' });
      showSuccess('Berhasil!', 'Data penggantian baterai berhasil ditambahkan!', true);
      setTimeout(() => handleClose(), 1500);
    } catch (error) {
      console.error('Error adding battery replacement:', error);
      showError('Gagal Menyimpan', 'Gagal menambahkan data penggantian baterai. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert date format from yyyy-mm-dd to dd/mm/yyyy
      const [year, month, day] = maintenanceFormData.date.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      // Add seconds to time format
      const formattedTime = `${maintenanceFormData.time}:00`;

      await addMaintenance({
        date: formattedDate,
        time: formattedTime,
        note: maintenanceFormData.note
      });

      // Reset form
      setMaintenanceFormData({ date: '', time: '', note: '' });
      showSuccess('Berhasil!', 'Data maintenance berhasil ditambahkan!', true);
      setTimeout(() => handleClose(), 1500);
    } catch (error) {
      console.error('Error adding maintenance:', error);
      showError('Gagal Menyimpan', 'Gagal menambahkan data maintenance. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFuelInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFuelFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBatteryInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBatteryFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMaintenanceInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMaintenanceFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFuelFormData({ date: '', time: '', amount: '' });
      setBatteryFormData({ date: '', time: '', battery_type: '', notes: '' });
      setMaintenanceFormData({ date: '', time: '', note: '' });
      onClose();
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'fuel': return 'Data Pengisian';
      case 'battery': return 'Penggantian Baterai';
      case 'maintenance': return 'Maintenance';
      default: return 'Tambah Data';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={handleBackdropClick}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] mx-4 flex flex-col overflow-hidden">
          {/* Modal Header with gradient */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Tambah Data</h3>
                <p className="text-emerald-100 text-sm mt-1">Data baru untuk sistem monitoring</p>
              </div>
              <button 
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-white hover:text-emerald-200 focus:outline-none disabled:opacity-50 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
          
          {/* Tab Selector */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveTab('fuel')}
                className={`px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  activeTab === 'fuel' 
                    ? 'bg-emerald-500 text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <i className="fas fa-gas-pump mr-2"></i>
                Data Pengisian
              </button>
              <button 
                onClick={() => setActiveTab('battery')}
                className={`px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  activeTab === 'battery' 
                    ? 'bg-emerald-500 text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <i className="fas fa-battery-full mr-2"></i>
                Penggantian Baterai
              </button>
              <button 
                onClick={() => setActiveTab('maintenance')}
                className={`px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  activeTab === 'maintenance' 
                    ? 'bg-emerald-500 text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <i className="fas fa-tools mr-2"></i>
                Maintenance
              </button>
            </div>
          </div>
          
          {/* Modal Content */}
          <div className="overflow-auto flex-grow p-6">
            {/* Fuel Refill Form */}
            {activeTab === 'fuel' && (
              <form onSubmit={handleFuelSubmit} className="space-y-6">
                {/* Date Input */}
                <div className="space-y-2">
                  <label htmlFor="date" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <i className="fas fa-calendar-alt mr-2 text-emerald-500"></i>
                    Tanggal Pengisian
                  </label>
                  <input 
                    type="date" 
                    id="date" 
                    name="date" 
                    value={fuelFormData.date}
                    onChange={handleFuelInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all duration-200" 
                    required 
                  />
                </div>
                
                {/* Time Input */}
                <div className="space-y-2">
                  <label htmlFor="time" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <i className="fas fa-clock mr-2 text-emerald-500"></i>
                    Waktu Pengisian
                  </label>
                  <input 
                    type="time" 
                    id="time" 
                    name="time" 
                    value={fuelFormData.time}
                    onChange={handleFuelInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all duration-200" 
                    required 
                  />
                </div>
                
                {/* Amount Input */}
                <div className="space-y-2">
                  <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <i className="fas fa-gas-pump mr-2 text-emerald-500"></i>
                    Jumlah Minyak (Liter)
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      inputMode="decimal" 
                      id="amount" 
                      name="amount" 
                      value={fuelFormData.amount}
                      onChange={handleFuelInputChange}
                      disabled={isSubmitting}
                      pattern="[0-9]+([.,][0-9]+)?" 
                      placeholder="Contoh: 25.5 atau 25,5" 
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all duration-200" 
                      required 
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">L</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <i className="fas fa-info-circle mr-1"></i>
                    Gunakan titik (.) atau koma (,) untuk desimal
                  </p>
                </div>
                
                {/* Footer for Fuel Form */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium disabled:opacity-50 flex items-center shadow-lg"
                  >
                    {isSubmitting && <i className="fas fa-spinner fa-spin mr-2"></i>}
                    <i className={`fas ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            )}
            
            {/* Battery Replacement Form */}
            {activeTab === 'battery' && (
              <form onSubmit={handleBatterySubmit} className="space-y-6">
                {/* Date Input */}
                <div className="space-y-2">
                  <label htmlFor="battery-date" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <i className="fas fa-calendar-alt mr-2 text-emerald-500"></i>
                    Tanggal Penggantian
                  </label>
                  <input 
                    type="date" 
                    id="battery-date" 
                    name="date" 
                    value={batteryFormData.date}
                    onChange={handleBatteryInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all duration-200" 
                    required 
                  />
                </div>
                
                {/* Time Input */}
                <div className="space-y-2">
                  <label htmlFor="battery-time" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <i className="fas fa-clock mr-2 text-emerald-500"></i>
                    Waktu Penggantian
                  </label>
                  <input 
                    type="time" 
                    id="battery-time" 
                    name="time" 
                    value={batteryFormData.time}
                    onChange={handleBatteryInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all duration-200" 
                    required 
                  />
                </div>
                
                {/* Battery Type Input */}
                <div className="space-y-2">
                  <label htmlFor="battery-type" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <i className="fas fa-battery-full mr-2 text-emerald-500"></i>
                    Tipe Baterai
                  </label>
                  <select
                    id="battery-type" 
                    name="battery_type" 
                    value={batteryFormData.battery_type}
                    onChange={handleBatteryInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all duration-200" 
                    required
                  >
                    <option value="">Pilih tipe baterai</option>
                    <option value="Lithium">Lithium</option>
                    <option value="Lead Acid">Lead Acid</option>
                    <option value="Alkaline">Alkaline</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                
                {/* Notes Input */}
                <div className="space-y-2">
                  <label htmlFor="battery-notes" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <i className="fas fa-sticky-note mr-2 text-emerald-500"></i>
                    Catatan
                  </label>
                  <textarea 
                    id="battery-notes" 
                    name="notes" 
                    value={batteryFormData.notes}
                    onChange={handleBatteryInputChange}
                    disabled={isSubmitting}
                    placeholder="Tambahkan catatan penggantian baterai" 
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all duration-200 min-h-[100px]" 
                    required 
                  />
                </div>
                
                {/* Footer for Battery Form */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium disabled:opacity-50 flex items-center shadow-lg"
                  >
                    {isSubmitting && <i className="fas fa-spinner fa-spin mr-2"></i>}
                    <i className={`fas ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            )}
            
            {/* Maintenance Form */}
            {activeTab === 'maintenance' && (
              <form onSubmit={handleMaintenanceSubmit} className="space-y-6">
                {/* Date Input */}
                <div className="space-y-2">
                  <label htmlFor="maintenance-date" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <i className="fas fa-calendar-alt mr-2 text-emerald-500"></i>
                    Tanggal Maintenance
                  </label>
                  <input 
                    type="date" 
                    id="maintenance-date" 
                    name="date" 
                    value={maintenanceFormData.date}
                    onChange={handleMaintenanceInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all duration-200" 
                    required 
                  />
                </div>
                
                {/* Time Input */}
                <div className="space-y-2">
                  <label htmlFor="maintenance-time" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <i className="fas fa-clock mr-2 text-emerald-500"></i>
                    Waktu Maintenance
                  </label>
                  <input 
                    type="time" 
                    id="maintenance-time" 
                    name="time" 
                    value={maintenanceFormData.time}
                    onChange={handleMaintenanceInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all duration-200" 
                    required 
                  />
                </div>
                
                {/* Note Input */}
                <div className="space-y-2">
                  <label htmlFor="maintenance-note" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <i className="fas fa-tools mr-2 text-emerald-500"></i>
                    Catatan Maintenance
                  </label>
                  <textarea 
                    id="maintenance-note" 
                    name="note" 
                    value={maintenanceFormData.note}
                    onChange={handleMaintenanceInputChange}
                    disabled={isSubmitting}
                    placeholder="Masukkan detail maintenance yang dilakukan" 
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-all duration-200 min-h-[150px]" 
                    required 
                  />
                </div>
                
                {/* Footer for Maintenance Form */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium disabled:opacity-50 flex items-center shadow-lg"
                  >
                    {isSubmitting && <i className="fas fa-spinner fa-spin mr-2"></i>}
                    <i className={`fas ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            )}
          </div>
          
          {/* Modal Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end">
            <button 
              onClick={handleClose}
              className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

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