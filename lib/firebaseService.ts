import { database } from './firebase';
import { ref, push, set, onValue, off, query, orderByChild, limitToLast, remove } from 'firebase/database';

export interface PowerStatus {
  pln: number;
  genset_135: number;
  genset_150: number;
  genset_radar: number;
  datetime: string;
}

export interface FuelLevel {
  reservoir?: number; // New dual tank format
  drum?: number; // New dual tank format
  level?: number; // Old single level format (for backward compatibility)
  datetime: string;
}

export interface FuelRefill {
  date: string;
  time: string;
  amount: number;
}

export interface SystemStatus {
  isOnline: number;
  datetime: string;
}

// Power Status Functions
export const addPowerStatus = async (status: PowerStatus) => {
  try {
    const statusRef = ref(database, 'status');
    const newStatusRef = push(statusRef);
    await set(newStatusRef, status);
    return newStatusRef.key;
  } catch (error) {
    console.error('Error adding power status:', error);
    throw error;
  }
};

export const subscribeToLatestPowerStatus = (callback: (status: PowerStatus & { id: string }) => void) => {
  const statusRef = query(ref(database, 'status'), orderByChild('datetime'), limitToLast(1));
  
  const unsubscribe = onValue(statusRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const latestKey = Object.keys(data)[0];
      const latestStatus = { ...data[latestKey], id: latestKey };
      callback(latestStatus);
    }
  });

  return () => off(statusRef, 'value', unsubscribe);
};

export const getAllPowerStatus = (callback: (statuses: (PowerStatus & { id: string })[]) => void) => {
  const statusRef = ref(database, 'status');
  
  const unsubscribe = onValue(statusRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const statuses = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
      callback(statuses);
    } else {
      callback([]);
    }
  });

  return () => off(statusRef, 'value', unsubscribe);
};

// Fuel Level Functions
export const addFuelLevel = async (level: FuelLevel) => {
  try {
    const levelRef = ref(database, 'level');
    const newLevelRef = push(levelRef);
    await set(newLevelRef, level);
    return newLevelRef.key;
  } catch (error) {
    console.error('Error adding fuel level:', error);
    throw error;
  }
};

export const subscribeToLatestFuelLevel = (callback: (level: FuelLevel & { id: string }) => void) => {
  const levelRef = query(ref(database, 'level'), orderByChild('datetime'), limitToLast(1));
  
  const unsubscribe = onValue(levelRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const latestKey = Object.keys(data)[0];
      const latestLevel = { ...data[latestKey], id: latestKey };
      callback(latestLevel);
    }
  });

  return () => off(levelRef, 'value', unsubscribe);
};

export const getAllFuelLevels = (callback: (levels: (FuelLevel & { id: string })[]) => void) => {
  const levelRef = ref(database, 'level');
  
  const unsubscribe = onValue(levelRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const levels = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
      callback(levels);
    } else {
      callback([]);
    }
  });

  return () => off(levelRef, 'value', unsubscribe);
};

// Fuel Refill Functions
export const addFuelRefill = async (refill: FuelRefill) => {
  try {
    const fuelRef = ref(database, 'fuel');
    const newFuelRef = push(fuelRef);
    await set(newFuelRef, refill);
    return newFuelRef.key;
  } catch (error) {
    console.error('Error adding fuel refill:', error);
    throw error;
  }
};

export const getAllFuelRefills = (callback: (refills: (FuelRefill & { id: string })[]) => void) => {
  const fuelRef = ref(database, 'fuel');
  
  const unsubscribe = onValue(fuelRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const refills = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB.getTime() - dateA.getTime();
      });
      callback(refills);
    } else {
      callback([]);
    }
  });

  return () => off(fuelRef, 'value', unsubscribe);
};

// System Status Functions
export const subscribeToSystemStatus = (callback: (status: SystemStatus & { id: string }) => void) => {
  const systemStatusRef = ref(database, 'system_status');
  
  const unsubscribe = onValue(systemStatusRef, (snapshot) => {
    console.log('Firebase snapshot exists:', snapshot.exists());
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('Raw Firebase data:', data);
      
      // Check if data is directly the system status object
      if (data && typeof data === 'object' && typeof data.datetime === 'string' && typeof data.isOnline === 'number') {
        console.log('Direct system status data:', data);
        callback({ ...data, id: 'latest' });
      } else {
        console.error('Invalid system status structure:', data);
      }
    } else {
      console.log('No system status data found in Firebase');
    }
  });

  return () => off(systemStatusRef, 'value', unsubscribe);
};

export const updateSystemStatus = async (status: SystemStatus) => {
  try {
    // Directly set the system status object at the system_status path
    const systemStatusRef = ref(database, 'system_status');
    await set(systemStatusRef, status);
    console.log('System status updated successfully:', status);
    return 'latest';
  } catch (error) {
    console.error('Error updating system status:', error);
    throw error;
  }
};

// Utility function to check if system is online based on datetime
export const isSystemOnline = (datetime: string): boolean => {
  try {
    // Parse datetime format dd/mm/yyyy hh:mm:ss
    const [datePart, timePart] = datetime.split(' ');
    if (!datePart || !timePart) {
      console.error('Invalid datetime format:', datetime);
      return false;
    }
    
    const [day, month, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');
    
    if (!day || !month || !year || !hours || !minutes || !seconds) {
      console.error('Invalid datetime components:', datetime);
      return false;
    }
    
    const statusDate = new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
    
    if (isNaN(statusDate.getTime())) {
      console.error('Invalid date created from:', datetime);
      return false;
    }
    
    const now = new Date();
    const diffInSeconds = (now.getTime() - statusDate.getTime()) / 1000;
    
    console.log('System status check:', {
      datetime,
      statusDate: statusDate.toISOString(),
      now: now.toISOString(),
      diffInSeconds,
      isOnline: diffInSeconds <= 30
    });
    
    return diffInSeconds <= 30; // Online if within 30 seconds
  } catch (error) {
    console.error('Error parsing datetime:', error);
    return false;
  }
};

// Utility function to format datetime
export const formatDateTime = (date: Date = new Date()): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// Utility function to format date
export const formatDate = (date: Date = new Date()): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Utility function to format time
export const formatTime = (date: Date = new Date()): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};