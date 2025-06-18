'use client';

import { useState, useCallback } from 'react';

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    autoClose: false,
    autoCloseDelay: 3000
  });

  const showAlert = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    options?: { autoClose?: boolean; autoCloseDelay?: number }
  ) => {
    setAlert({
      isOpen: true,
      type,
      title,
      message,
      autoClose: options?.autoClose || false,
      autoCloseDelay: options?.autoCloseDelay || 3000
    });
  }, []);

  const showSuccess = useCallback((title: string, message: string, autoClose = true) => {
    showAlert('success', title, message, { autoClose, autoCloseDelay: 3000 });
  }, [showAlert]);

  const showError = useCallback((title: string, message: string, autoClose = false) => {
    showAlert('error', title, message, { autoClose });
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string, autoClose = false) => {
    showAlert('warning', title, message, { autoClose });
  }, [showAlert]);

  const showInfo = useCallback((title: string, message: string, autoClose = false) => {
    showAlert('info', title, message, { autoClose });
  }, [showAlert]);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    alert,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideAlert
  };
}