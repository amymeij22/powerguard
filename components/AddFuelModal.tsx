'use client';

import { useState } from 'react';
import { addFuelRefill, formatDate, formatTime } from '@/lib/firebaseService';

interface AddFuelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddFuelModal({ isOpen, onClose }: AddFuelModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    amount: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle click outside modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert amount to number and validate
      const amount = parseFloat(formData.amount.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        alert('Jumlah minyak harus berupa angka yang valid dan lebih dari 0');
        setIsSubmitting(false);
        return;
      }

      // Convert date format from yyyy-mm-dd to dd/mm/yyyy
      const [year, month, day] = formData.date.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      // Add seconds to time format
      const formattedTime = `${formData.time}:00`;

      await addFuelRefill({
        date: formattedDate,
        time: formattedTime,
        amount: amount
      });

      // Reset form and close modal
      setFormData({ date: '', time: '', amount: '' });
      onClose();
      alert('Data pengisian minyak berhasil ditambahkan!');
    } catch (error) {
      console.error('Error adding fuel refill:', error);
      alert('Gagal menambahkan data pengisian minyak. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ date: '', time: '', amount: '' });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={handleBackdropClick}>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Modal Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">Tambah Data Pengisian</h3>
              <p className="text-emerald-100 text-sm mt-1">Catat pengisian minyak genset</p>
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
        
        {/* Modal Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                value={formData.date}
                onChange={handleInputChange}
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
                value={formData.time}
                onChange={handleInputChange}
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
                  value={formData.amount}
                  onChange={handleInputChange}
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
          </form>
        </div>
        
        {/* Modal Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end space-x-3">
          <button 
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200 font-medium disabled:opacity-50"
          >
            Batal
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium disabled:opacity-50 flex items-center shadow-lg"
          >
            {isSubmitting && <i className="fas fa-spinner fa-spin mr-2"></i>}
            <i className={`fas ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
          </button>
        </div>
      </div>
    </div>
  );
}