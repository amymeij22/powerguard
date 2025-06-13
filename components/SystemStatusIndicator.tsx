'use client';

import { useState, useEffect, useRef } from 'react';
import { subscribeToSystemStatus, isSystemOnline, SystemStatus } from '@/lib/firebaseService';

export default function SystemStatusIndicator() {
  const [systemStatus, setSystemStatus] = useState<{
    isOnline: boolean;
    lastUpdate: string;
    isLoading: boolean;
  }>({
    isOnline: false,
    lastUpdate: '',
    isLoading: true
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestDatetimeRef = useRef<string>('');

  // Function to check and update online status based on current time
  const checkOnlineStatus = () => {
    if (latestDatetimeRef.current) {
      const online = isSystemOnline(latestDatetimeRef.current);
      setSystemStatus(prev => ({
        ...prev,
        isOnline: online
      }));
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToSystemStatus((status: SystemStatus & { id: string }) => {
      console.log('Received system status:', status);
      
      if (status && status.datetime && typeof status.isOnline === 'number') {
        latestDatetimeRef.current = status.datetime;
        const online = status.isOnline === 1 && isSystemOnline(status.datetime);
        setSystemStatus({
          isOnline: online,
          lastUpdate: status.datetime,
          isLoading: false
        });
      } else {
        console.error('Invalid system status received:', status);
        setSystemStatus(prev => ({
          ...prev,
          isLoading: false
        }));
      }
    });

    // Set up interval to check status every second
    intervalRef.current = setInterval(checkOnlineStatus, 1000);

    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getStatusColor = () => {
    if (systemStatus.isLoading) {
      return 'text-gray-400';
    }
    return systemStatus.isOnline ? 'text-pln' : 'text-danger';
  };

  const getStatusTitle = () => {
    if (systemStatus.isLoading) {
      return 'Memuat status sistem...';
    }
    
    if (systemStatus.lastUpdate) {
      if (systemStatus.isOnline) {
        return `Sistem Online - Terakhir update: ${systemStatus.lastUpdate}`;
      } else {
        return `Sistem Offline - Terakhir update: ${systemStatus.lastUpdate}`;
      }
    } else {
      return 'Status sistem tidak tersedia';
    }
  };

  const getIconClass = () => {
    if (systemStatus.isLoading) {
      return 'fas fa-spinner fa-spin';
    }
    return 'fas fa-wifi';
  };

  return (
    <div 
      className={`w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all`}
      title={getStatusTitle()}
    >
      <i className={`${getIconClass()} ${getStatusColor()}`}></i>
    </div>
  );
}