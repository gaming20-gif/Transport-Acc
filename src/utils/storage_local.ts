import type { Vehicle, Transaction, VehicleSummary, Trip, TripExpense } from '../types';

const STORAGE_KEYS = {
  VEHICLES: 'transport_acc_vehicles',
  TRANSACTIONS: 'transport_acc_transactions',
  TRIPS: 'transport_acc_trips',
};

// Help generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

export const getVehicles = (): Vehicle[] => {
  const data = localStorage.getItem(STORAGE_KEYS.VEHICLES);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Error parsing vehicles data', e);
    return [];
  }
};

export const saveVehicles = (vehicles: Vehicle[]): void => {
  localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
};

export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Error parsing transactions data', e);
    return [];
  }
};

export const saveTransactions = (transactions: Transaction[]): void => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

// CRUD for Vehicles
export const addVehicle = (vehicleData: Omit<Vehicle, 'id' | 'addedAt'>): Vehicle => {
  const vehicles = getVehicles();
  const newVehicle: Vehicle = {
    ...vehicleData,
    id: generateId(),
    addedAt: new Date().toISOString().split('T')[0],
  };
  vehicles.push(newVehicle);
  saveVehicles(vehicles);
  return newVehicle;
};

export const updateVehicle = (updatedVehicle: Vehicle): void => {
  const vehicles = getVehicles();
  const index = vehicles.findIndex((v) => v.id === updatedVehicle.id);
  if (index !== -1) {
    vehicles[index] = updatedVehicle;
    saveVehicles(vehicles);
  }
};

export const deleteVehicle = (vehicleId: string): void => {
  // Delete vehicle
  const vehicles = getVehicles();
  saveVehicles(vehicles.filter((v) => v.id !== vehicleId));

  // Cascade delete transactions
  const transactions = getTransactions();
  saveTransactions(transactions.filter((t) => t.vehicleId !== vehicleId));

  // Cascade delete trips
  const trips = getTrips();
  saveTrips(trips.filter((t) => t.vehicleId !== vehicleId));
};

// CRUD for Transactions
export const addTransaction = (transData: Omit<Transaction, 'id'>): Transaction => {
  const transactions = getTransactions();
  const newTrans: Transaction = {
    ...transData,
    id: generateId(),
  };
  transactions.push(newTrans);
  // Sort transactions by date descending
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveTransactions(transactions);
  return newTrans;
};

export const updateTransaction = (updatedTrans: Transaction): void => {
  const transactions = getTransactions();
  const index = transactions.findIndex((t) => t.id === updatedTrans.id);
  if (index !== -1) {
    transactions[index] = updatedTrans;
    // Sort transactions by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    saveTransactions(transactions);
  }
};

export const deleteTransaction = (transId: string): void => {
  const transactions = getTransactions();
  saveTransactions(transactions.filter((t) => t.id !== transId));
};

// Queries and Calculations
export const getVehicleTransactions = (vehicleId: string): Transaction[] => {
  const transactions = getTransactions();
  return transactions.filter((t) => t.vehicleId === vehicleId);
};

export const getVehicleSummary = (vehicleId: string): VehicleSummary => {
  const vehicles = getVehicles();
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const vehicleNumber = vehicle ? vehicle.vehicleNumber : 'Unknown';

  const txs = getVehicleTransactions(vehicleId);
  let totalIncome = 0;
  let totalExpense = 0;

  txs.forEach((t) => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
    }
  });

  return {
    vehicleId,
    vehicleNumber,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
};

export const getGlobalSummary = () => {
  const transactions = getTransactions();
  const vehicles = getVehicles();
  
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((t) => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
    }
  });

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    vehicleCount: vehicles.length,
    transactionCount: transactions.length,
  };
};

// Backup & Recovery
export const exportData = (): string => {
  const data = {
    vehicles: getVehicles(),
    transactions: getTransactions(),
  };
  return JSON.stringify(data, null, 2);
};

export const importData = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData);
    if (data && Array.isArray(data.vehicles) && Array.isArray(data.transactions)) {
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(data.vehicles));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
};

// Sample Data Initialization
export const initSampleData = (force = false): void => {
  if (!force && getVehicles().length > 0) return;

  const sampleVehicles: Vehicle[] = [
    {
      id: 'v-1',
      vehicleNumber: 'MH-12-PQ-9876',
      driverName: 'Rajesh Kumar',
      driverPhone: '9876543210',
      ownerName: 'Transport Logistics',
      type: '10-Wheeler Truck',
      status: 'Active',
      addedAt: '2026-05-01',
    },
    {
      id: 'v-2',
      vehicleNumber: 'DL-01-AB-4321',
      driverName: 'Gurpreet Singh',
      driverPhone: '8765432109',
      ownerName: 'Transport Logistics',
      type: '18-Wheeler Trailer',
      status: 'Active',
      addedAt: '2026-05-02',
    },
    {
      id: 'v-3',
      vehicleNumber: 'KA-03-XY-5555',
      driverName: 'Suresh Kumar',
      driverPhone: '7654321098',
      ownerName: 'Self',
      type: '6-Wheeler Dumper',
      status: 'Maintenance',
      addedAt: '2026-05-05',
    },
  ];

  const sampleTransactions: Transaction[] = [
    // MH-12-PQ-9876 transactions
    {
      id: 't-1',
      vehicleId: 'v-1',
      date: '2026-05-02',
      type: 'income',
      category: 'Freight Booking',
      amount: 65000,
      paymentMode: 'Bank',
      description: 'Pune to Mumbai heavy load transport booking',
    },
    {
      id: 't-2',
      vehicleId: 'v-1',
      date: '2026-05-02',
      type: 'expense',
      category: 'Diesel / Fuel',
      amount: 18000,
      paymentMode: 'Cash',
      description: 'Full tank refuel at HP Pump Pune',
    },
    {
      id: 't-3',
      vehicleId: 'v-1',
      date: '2026-05-03',
      type: 'expense',
      category: 'Toll Charges',
      amount: 3200,
      paymentMode: 'UPI',
      description: 'Expressway toll charge Fastag',
    },
    {
      id: 't-4',
      vehicleId: 'v-1',
      date: '2026-05-05',
      type: 'expense',
      category: 'Driver Salary / Batta',
      amount: 8000,
      paymentMode: 'Bank',
      description: 'Driver salary advance for the trip',
    },
    {
      id: 't-5',
      vehicleId: 'v-1',
      date: '2026-05-10',
      type: 'income',
      category: 'Freight Booking',
      amount: 72000,
      paymentMode: 'Bank',
      description: 'Mumbai to Nagpur logistics trip',
    },
    {
      id: 't-6',
      vehicleId: 'v-1',
      date: '2026-05-11',
      type: 'expense',
      category: 'Diesel / Fuel',
      amount: 22000,
      paymentMode: 'UPI',
      description: 'Diesel purchase Nagpur Highway',
    },
    {
      id: 't-7',
      vehicleId: 'v-1',
      date: '2026-05-14',
      type: 'expense',
      category: 'Maintenance & Repairs',
      amount: 4500,
      paymentMode: 'Cash',
      description: 'Engine oil top-up and filter change',
    },
    {
      id: 't-8',
      vehicleId: 'v-1',
      date: '2026-05-18',
      type: 'income',
      category: 'Demurrage (Waiting Charges)',
      amount: 5000,
      paymentMode: 'Cash',
      description: 'Unloading delay charges 2 days at Nagpur warehouse',
    },
    {
      id: 't-9',
      vehicleId: 'v-1',
      date: '2026-05-20',
      type: 'expense',
      category: 'RTO / Challan / Fine',
      amount: 1500,
      paymentMode: 'UPI',
      description: 'Overweight challan fine at checkpost',
    },
    {
      id: 't-10',
      vehicleId: 'v-1',
      date: '2026-05-25',
      type: 'expense',
      category: 'Office/Admin Expense',
      amount: 1200,
      paymentMode: 'Cash',
      description: 'Loading supervisor tea & snacks',
    },

    // DL-01-AB-4321 transactions
    {
      id: 't-11',
      vehicleId: 'v-2',
      date: '2026-05-04',
      type: 'income',
      category: 'Freight Booking',
      amount: 110000,
      paymentMode: 'Bank',
      description: 'Delhi to Ahmedabad machinery transport',
    },
    {
      id: 't-12',
      vehicleId: 'v-2',
      date: '2026-05-04',
      type: 'expense',
      category: 'Diesel / Fuel',
      amount: 35000,
      paymentMode: 'UPI',
      description: 'Diesel at Delhi Bypass fuel pump',
    },
    {
      id: 't-13',
      vehicleId: 'v-2',
      date: '2026-05-05',
      type: 'expense',
      category: 'Toll Charges',
      amount: 6800,
      paymentMode: 'UPI',
      description: 'Fastag tolls Delhi-Ahmedabad corridor',
    },
    {
      id: 't-14',
      vehicleId: 'v-2',
      date: '2026-05-08',
      type: 'expense',
      category: 'Driver Salary / Batta',
      amount: 12000,
      paymentMode: 'Bank',
      description: 'Gurpreet driver trip salary and batta',
    },
    {
      id: 't-15',
      vehicleId: 'v-2',
      date: '2026-05-12',
      type: 'income',
      category: 'Freight Booking',
      amount: 98000,
      paymentMode: 'Bank',
      description: 'Ahmedabad to Delhi chemical container booking',
    },
    {
      id: 't-16',
      vehicleId: 'v-2',
      date: '2026-05-13',
      type: 'expense',
      category: 'Diesel / Fuel',
      amount: 31000,
      paymentMode: 'Cash',
      description: 'Fuel refuel for return trip',
    },
    {
      id: 't-17',
      vehicleId: 'v-2',
      date: '2026-05-26',
      type: 'expense',
      category: 'Tyre Expense',
      amount: 18000,
      paymentMode: 'Bank',
      description: 'Rear tyre puncture and new re-treading service',
    },

    // KA-03-XY-5555 transactions
    {
      id: 't-18',
      vehicleId: 'v-3',
      date: '2026-05-06',
      type: 'income',
      category: 'Freight Booking',
      amount: 40000,
      paymentMode: 'Bank',
      description: 'Bangalore local sand transport 4 rounds',
    },
    {
      id: 't-19',
      vehicleId: 'v-3',
      date: '2026-05-06',
      type: 'expense',
      category: 'Diesel / Fuel',
      amount: 12000,
      paymentMode: 'Cash',
      description: 'Local bunk diesel',
    },
    {
      id: 't-20',
      vehicleId: 'v-3',
      date: '2026-05-08',
      type: 'expense',
      category: 'Maintenance & Repairs',
      amount: 25000,
      paymentMode: 'Bank',
      description: 'Hydraulic lifter repair and seal replacement (under maintenance)',
    },
  ];

  saveVehicles(sampleVehicles);
  // Sort descending
  sampleTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveTransactions(sampleTransactions);
};

// ==========================================
// Trip Module Storage Utility & Sync Helpers
// ==========================================

const syncTripTransactions = (trip: Trip): void => {
  // First, remove any existing transactions with this tripId
  let transactions = getTransactions();
  transactions = transactions.filter(t => t.tripId !== trip.id);

  // Helper to push a synced transaction
  const addSyncedTx = (
    type: 'income' | 'expense',
    category: any,
    amount: number,
    paymentMode: 'Cash' | 'Bank' | 'UPI' | 'Pending',
    description: string,
    customDate?: string
  ) => {
    if (amount <= 0) return;
    transactions.push({
      id: `tx-trip-${trip.id}-${category.toLowerCase().replace(/[^a-z0-9]/g, '')}-${type}-${Math.random().toString(36).substring(2, 6)}`,
      vehicleId: trip.vehicleId,
      date: customDate || trip.date,
      type,
      category,
      amount,
      paymentMode,
      description,
      tripId: trip.id
    });
  };

  // Determine income split
  // If status is Paid: entire totalIncome is logged using trip.paymentMode
  // If status is Pending: entire totalIncome is logged as Pending
  // If status is Partial: advanceReceived is logged using trip.paymentMode, and the rest as Pending
  const incomeMode = trip.paymentStatus === 'Pending' ? 'Pending' : (trip.paymentMode === 'Pending' ? 'Cash' : trip.paymentMode);

  if (trip.paymentStatus === 'Paid') {
    // Single paid entry
    addSyncedTx('income', 'Freight Booking', trip.totalIncome, incomeMode, `Trip #${trip.tripNumber}: Freight Income (Paid via ${incomeMode})`);
  } else if (trip.paymentStatus === 'Pending') {
    // Single pending entry
    addSyncedTx('income', 'Freight Booking', trip.totalIncome, 'Pending', `Trip #${trip.tripNumber}: Freight Income (Pending)`);
  } else if (trip.paymentStatus === 'Partial') {
    // Split: Paid portion (advance) and Pending portion (balance)
    const paidPortion = trip.advanceReceived;
    const pendingPortion = trip.totalIncome - trip.advanceReceived;
    
    if (paidPortion > 0) {
      addSyncedTx('income', 'Freight Booking', paidPortion, incomeMode, `Trip #${trip.tripNumber}: Freight Advance received (via ${incomeMode})`);
    }
    if (pendingPortion > 0) {
      addSyncedTx('income', 'Freight Booking', pendingPortion, 'Pending', `Trip #${trip.tripNumber}: Freight Balance (Pending)`);
    }
  }

  // Expenses are always paid immediately (either Cash, Bank, UPI). 
  // If trip payment mode is Pending, fallback to Cash for expenses, else use trip.paymentMode.
  const expenseMode = trip.paymentMode === 'Pending' ? 'Cash' : trip.paymentMode;

  if (trip.expenses && Array.isArray(trip.expenses)) {
    trip.expenses.forEach(exp => {
      let ledgerCat: any = 'Other Expense';
      if (exp.category === 'Diesel') ledgerCat = 'Diesel / Fuel';
      else if (exp.category === 'Toll Tax') ledgerCat = 'Toll Charges';
      else if (exp.category === 'Driver Advance' || exp.category === 'Driver Salary') ledgerCat = 'Driver Salary / Batta';
      else if (exp.category === 'Loading Expense' || exp.category === 'Unloading Expense') ledgerCat = 'Loading/Unloading Labour';
      else if (exp.category === 'Repair & Maintenance' || exp.category === 'Puncture') ledgerCat = 'Maintenance & Repairs';
      else if (exp.category === 'Tyre Expense') ledgerCat = 'Tyre Expense';
      
      const remarksText = exp.remarks ? ` - ${exp.remarks}` : '';
      addSyncedTx(
        'expense', 
        ledgerCat, 
        exp.amount, 
        expenseMode, 
        `Trip #${trip.tripNumber}: ${exp.category}${remarksText}`,
        exp.date
      );
    });
  }

  // Sort transactions descending by date
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveTransactions(transactions);
};

export const getTrips = (): Trip[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRIPS);
  if (!data) return [];
  try {
    const rawTrips: any[] = JSON.parse(data);
    
    // Auto-migrate old flat trips to new expenses array format
    let hasMigrated = false;
    const migratedTrips = rawTrips.map(trip => {
      if (!trip.expenses) {
        const expenseList: TripExpense[] = [];
        const addIfValue = (cat: any, val?: number) => {
          if (val && val > 0) {
            expenseList.push({
              id: `migration-${Math.random().toString(36).substring(2, 6)}`,
              date: trip.date,
              category: cat,
              amount: val,
              remarks: 'Migrated flat expense'
            });
          }
        };
        addIfValue('Diesel', trip.diesel);
        addIfValue('Toll Tax', trip.tollTax);
        addIfValue('Driver Advance', trip.driverAdvance);
        addIfValue('Driver Salary', trip.driverSalary);
        addIfValue('Helper Expense', trip.helperExpense);
        addIfValue('Loading Expense', trip.loadingExpense);
        addIfValue('Unloading Expense', trip.unloadingExpense);
        addIfValue('Parking', trip.parking);
        addIfValue('Repair & Maintenance', trip.repairMaintenance);
        addIfValue('Tyre Expense', trip.tyreExpense);
        addIfValue('Puncture', trip.puncture);
        addIfValue('Food Expense', trip.foodExpense);
        addIfValue('Miscellaneous Expense', trip.miscellaneousExpense);

        trip.expenses = expenseList;
        hasMigrated = true;
      }
      return trip as Trip;
    });

    if (hasMigrated) {
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(migratedTrips));
    }
    
    return migratedTrips;
  } catch (e) {
    console.error('Error parsing trips data', e);
    return [];
  }
};

export const saveTrips = (trips: Trip[]): void => {
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
};

export const addTrip = (tripData: Omit<Trip, 'id' | 'tripNumber'>): Trip => {
  const trips = getTrips();
  
  // Calculate next auto trip number (e.g. TRP-1001)
  let nextNum = 1001;
  if (trips.length > 0) {
    const nums = trips
      .map(t => parseInt(t.tripNumber.replace('TRP-', '')))
      .filter(n => !isNaN(n));
    if (nums.length > 0) {
      nextNum = Math.max(...nums) + 1;
    }
  }
  
  const newTrip: Trip = {
    ...tripData,
    id: generateId(),
    tripNumber: `TRP-${nextNum}`
  };

  trips.push(newTrip);
  saveTrips(trips);
  
  // Sync to ledger accounting
  syncTripTransactions(newTrip);

  return newTrip;
};

export const updateTrip = (updatedTrip: Trip): void => {
  const trips = getTrips();
  const index = trips.findIndex(t => t.id === updatedTrip.id);
  if (index !== -1) {
    trips[index] = updatedTrip;
    saveTrips(trips);
    
    // Sync to ledger accounting
    syncTripTransactions(updatedTrip);
  }
};

export const deleteTrip = (tripId: string): void => {
  const trips = getTrips();
  saveTrips(trips.filter(t => t.id !== tripId));

  // Cascade delete matching transactions
  const transactions = getTransactions();
  saveTransactions(transactions.filter(t => t.tripId !== tripId));
};
