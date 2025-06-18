'use client';

import { useEffect } from 'react';

interface AlertPopupProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function AlertPopup({
  isOpen,
  type,
  title,
  message,
  onClose,
  autoClose = false,
  autoCloseDelay = 3000
}: AlertPopupProps) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          icon: 'fas fa-check-circle text-green-500',
          titleColor: 'text-green-800 dark:text-green-200',
          messageColor: 'text-green-700 dark:text-green-300'
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'fas fa-exclamation-circle text-red-500',
          titleColor: 'text-red-800 dark:text-red-200',
          messageColor: 'text-red-700 dark:text-red-300'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: 'fas fa-exclamation-triangle text-yellow-500',
          titleColor: 'text-yellow-800 dark:text-yellow-200',
          messageColor: 'text-yellow-700 dark:text-yellow-300'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'fas fa-info-circle text-blue-500',
          titleColor: 'text-blue-800 dark:text-blue-200',
          messageColor: 'text-blue-700 dark:text-blue-300'
        };
    }
  };

  const styles = getAlertStyles();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`max-w-md w-full ${styles.bg} ${styles.border} border rounded-xl shadow-2xl transform transition-all duration-300 scale-100`}>
        <div className="p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <i className={`${styles.icon} text-2xl`}></i>
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-lg font-semibold ${styles.titleColor} mb-2`}>
                {title}
              </h3>
              <p className={`text-sm ${styles.messageColor} leading-relaxed`}>
                {message}
              </p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
          
          {/* Auto-close progress bar */}
          {autoClose && (
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
              <div 
                className={`h-full ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'} transition-all ease-linear`}
                style={{
                  animation: `shrink ${autoCloseDelay}ms linear forwards`
                }}
              ></div>
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                type === 'success' 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : type === 'error' 
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : type === 'warning'
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}