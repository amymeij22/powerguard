const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set, remove } = require('firebase/database');

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyDDOVq41QOJgJXV5Q6rmKm1CMG26derIq4",
  authDomain: "powerguard-bbmkg.firebaseapp.com",
  databaseURL: "https://powerguard-bbmkg-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "powerguard-bbmkg",
  storageBucket: "powerguard-bbmkg.firebasestorage.app",
  messagingSenderId: "932332046448",
  appId: "1:932332046448:web:f14131ff8d1813ab0b4cb5",
  measurementId: "G-WQVF975WC7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Utility function to format datetime
const formatDateTime = (date = new Date()) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// Utility function to format date
const formatDate = (date = new Date()) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Utility function to format time
const formatTime = (date = new Date()) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

// Function to generate random power status
const generateRandomPowerStatus = () => {
  // Simulate different scenarios
  const scenarios = [
    { pln: 1, genset_135: 0, genset_150: 0, genset_radar: 0 }, // PLN only
    { pln: 0, genset_135: 1, genset_150: 1, genset_radar: 0 }, // PLN off, gensets on
    { pln: 1, genset_135: 1, genset_150: 0, genset_radar: 0 }, // PLN + backup
    { pln: 0, genset_135: 0, genset_150: 0, genset_radar: 1 }, // Only radar genset
    { pln: 1, genset_135: 0, genset_150: 1, genset_radar: 0 }, // PLN + 150kVA
  ];
  
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  return {
    ...randomScenario,
    datetime: formatDateTime()
  };
};

// Function to generate random dual fuel level
const generateRandomDualFuelLevel = () => {
  // Generate fuel levels between 20-95% for both tanks
  const reservoir = Math.floor(Math.random() * 76) + 20;
  const drum = Math.floor(Math.random() * 76) + 20;
  
  return {
    reservoir: reservoir,
    drum: drum,
    datetime: formatDateTime()
  };
};

// Function to generate system status
const generateSystemStatus = () => {
  return {
    isOnline: 1,
    datetime: formatDateTime()
  };
};

// Function to add power status to Firebase
const addPowerStatus = async (status) => {
  try {
    const statusRef = ref(database, 'status');
    const newStatusRef = push(statusRef);
    await set(newStatusRef, status);
    console.log('✅ Power status added:', status);
  } catch (error) {
    console.error('❌ Error adding power status:', error);
  }
};

// Function to add dual fuel level to Firebase
const addDualFuelLevel = async (level) => {
  try {
    const levelRef = ref(database, 'level');
    const newLevelRef = push(levelRef);
    await set(newLevelRef, level);
    console.log('✅ Dual fuel level added:', level);
  } catch (error) {
    console.error('❌ Error adding dual fuel level:', error);
  }
};

// Function to add fuel refill to Firebase
const addFuelRefill = async (refill) => {
  try {
    const fuelRef = ref(database, 'fuel');
    const newFuelRef = push(fuelRef);
    await set(newFuelRef, refill);
    console.log('✅ Fuel refill added:', refill);
  } catch (error) {
    console.error('❌ Error adding fuel refill:', error);
  }
};

// Function to update system status
const updateSystemStatus = async (status) => {
  try {
    // Directly set the system status object at the system_status path
    const systemStatusRef = ref(database, 'system_status');
    await set(systemStatusRef, status);
    console.log('✅ System status updated:', status);
  } catch (error) {
    console.error('❌ Error updating system status:', error);
  }
};

// Function to create initial dummy fuel refill data
const createInitialFuelRefillData = async () => {
  console.log('🔄 Creating initial fuel refill data...');
  
  const dummyRefills = [
    {
      date: formatDate(new Date(2025, 0, 15)), // 15 Jan 2025
      time: '08:30:00',
      amount: 25.5
    },
    {
      date: formatDate(new Date(2025, 0, 10)), // 10 Jan 2025
      time: '14:15:00',
      amount: 30.0
    },
    {
      date: formatDate(new Date(2025, 0, 5)), // 5 Jan 2025
      time: '09:45:00',
      amount: 28.7
    },
    {
      date: formatDate(new Date(2024, 11, 28)), // 28 Dec 2024
      time: '16:20:00',
      amount: 32.1
    },
    {
      date: formatDate(new Date(2024, 11, 20)), // 20 Dec 2024
      time: '11:10:00',
      amount: 27.3
    }
  ];

  for (const refill of dummyRefills) {
    await addFuelRefill(refill);
    // Small delay to ensure proper ordering
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('✅ Initial fuel refill data created successfully!');
};

// Function to create initial system status
const createInitialSystemStatus = async () => {
  console.log('🔄 Creating initial system status...');
  await updateSystemStatus(generateSystemStatus());
  console.log('✅ Initial system status created successfully!');
};

// Function to start continuous data simulation
const startDataSimulation = () => {
  console.log('🚀 Starting PowerGuard data simulation...');
  console.log('📊 Power status updates every 10 seconds');
  console.log('⛽ Dual fuel level updates every 10 seconds');
  console.log('🌐 System status updates every 10 seconds');
  console.log('🛑 Press Ctrl+C to stop simulation\n');

  // Send initial data immediately
  addPowerStatus(generateRandomPowerStatus());
  addDualFuelLevel(generateRandomDualFuelLevel());
  updateSystemStatus(generateSystemStatus());

  // Set up intervals for continuous data sending
  const powerStatusInterval = setInterval(() => {
    addPowerStatus(generateRandomPowerStatus());
  }, 10000); // Every 10 seconds

  const fuelLevelInterval = setInterval(() => {
    addDualFuelLevel(generateRandomDualFuelLevel());
  }, 10000); // Every 10 seconds

  const systemStatusInterval = setInterval(() => {
    updateSystemStatus(generateSystemStatus());
  }, 10000); // Every 10 seconds

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping data simulation...');
    clearInterval(powerStatusInterval);
    clearInterval(fuelLevelInterval);
    clearInterval(systemStatusInterval);
    console.log('✅ Data simulation stopped successfully!');
    process.exit(0);
  });
};

// Main function
const main = async () => {
  try {
    console.log('🔥 PowerGuard Firebase Data Simulator');
    console.log('=====================================\n');

    // Create initial dummy data
    await createInitialFuelRefillData();
    
    // Create initial system status
    await createInitialSystemStatus();
    
    console.log('\n⏳ Starting data simulation in 3 seconds...\n');
    
    // Wait 3 seconds before starting simulation
    setTimeout(() => {
      startDataSimulation();
    }, 3000);

  } catch (error) {
    console.error('❌ Error in main function:', error);
    process.exit(1);
  }
};

// Run the simulator
main();