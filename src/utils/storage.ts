import type { Vehicle, Transaction, VehicleSummary, Trip } from '../types';

const API_BASE = '/api';

// Help generate unique IDs for local use before sending, though MongoDB will also give _id
const generateId = () => Math.random().toString(36).substring(2, 9);

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const loginUser = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  return data; // { token, user }
};

export const signupUser = async (username: string, email: string, password: string) => {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Signup failed');
  }
  return data; // { token, user }
};

export const getMe = async () => {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error('Failed to retrieve user info');
  }
  return await res.json();
};

// ==============================
// API CALLS
// ==============================

// Vehicles
export const getVehicles = async (): Promise<Vehicle[]> => {
  try {
    const res = await fetch(`${API_BASE}/vehicles`, {
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (e) {
    console.error('Error fetching vehicles', e);
    return [];
  }
};

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'addedAt'>): Promise<Vehicle | null> => {
  const newVehicle = {
    ...vehicleData,
    id: generateId(),
    addedAt: new Date().toISOString().split('T')[0],
  };
  try {
    const res = await fetch(`${API_BASE}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(newVehicle)
    });
    return await res.json();
  } catch (e) {
    console.error('Error adding vehicle', e);
    return null;
  }
};

export const updateVehicle = async (updatedVehicle: Vehicle): Promise<void> => {
  try {
    await fetch(`${API_BASE}/vehicles/${updatedVehicle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updatedVehicle)
    });
  } catch (e) {
    console.error('Error updating vehicle', e);
  }
};

export const deleteVehicle = async (vehicleId: string): Promise<void> => {
  try {
    await fetch(`${API_BASE}/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  } catch (e) {
    console.error('Error deleting vehicle', e);
  }
};


// Transactions
export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return data.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return dateA - dateB; // Chronological ascending: oldest first
      }
      // Tie-breaker: insertion time ascending
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (a._id && b._id) {
        return a._id.localeCompare(b._id);
      }
      return 0;
    });
  } catch (e) {
    console.error('Error fetching transactions', e);
    return [];
  }
};

export const addTransaction = async (transData: Omit<Transaction, 'id'>): Promise<Transaction | null> => {
  const newTrans = {
    ...transData,
    id: generateId(),
  };
  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(newTrans)
    });
    return await res.json();
  } catch (e) {
    console.error('Error adding transaction', e);
    return null;
  }
};

export const addTransactionPayment = async (
  transId: string,
  paymentData: { date: string; amount: number; paymentMode: string; description: string }
): Promise<Transaction | null> => {
  try {
    const res = await fetch(`${API_BASE}/transactions/${transId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(paymentData)
    });
    return await res.json();
  } catch (e) {
    console.error('Error adding transaction payment', e);
    return null;
  }
};

export const updateTransaction = async (updatedTrans: Transaction): Promise<void> => {
  try {
    await fetch(`${API_BASE}/transactions/${updatedTrans.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updatedTrans)
    });
  } catch (e) {
    console.error('Error updating transaction', e);
  }
};

export const deleteTransaction = async (transId: string): Promise<void> => {
  try {
    await fetch(`${API_BASE}/transactions/${transId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  } catch (e) {
    console.error('Error deleting transaction', e);
  }
};


// Trips
export const getTrips = async (): Promise<Trip[]> => {
  try {
    const res = await fetch(`${API_BASE}/trips`, {
      headers: getAuthHeaders()
    });
    let trips = await res.json();
    
    // Client-side migration for old data structure if needed
    trips = trips.map((trip: any) => {
      if (!trip.expenses || !Array.isArray(trip.expenses)) {
        trip.expenses = [];
      }
      return trip;
    });
    return trips;
  } catch (e) {
    console.error('Error fetching trips', e);
    return [];
  }
};

export const saveTrips = async (): Promise<void> => {
  // This bulk save is mostly used for local storage logic, we can ignore for REST API
  console.warn("saveTrips is deprecated in API mode");
};

export const addTrip = async (tripData: Omit<Trip, 'id'>): Promise<Trip | null> => {
  const newTrip = {
    ...tripData,
    id: generateId(),
  };
  try {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(newTrip)
    });
    return await res.json();
  } catch (e) {
    console.error('Error adding trip', e);
    return null;
  }
};

export const updateTrip = async (updatedTrip: Trip): Promise<void> => {
  try {
    await fetch(`${API_BASE}/trips/${updatedTrip.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updatedTrip)
    });
  } catch (e) {
    console.error('Error updating trip', e);
  }
};

export const deleteTrip = async (tripId: string): Promise<void> => {
  try {
    await fetch(`${API_BASE}/trips/${tripId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  } catch (e) {
    console.error('Error deleting trip', e);
  }
};


// ==============================
// BUSINESS LOGIC & SUMMARIES (PURE FUNCTIONS)
// ==============================

export const getVehicleSummary = (vehicleId: string, vehicles: Vehicle[], transactions: Transaction[]): VehicleSummary => {
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const vehicleNumber = vehicle ? vehicle.vehicleNumber : 'Unknown';

  const txs = transactions.filter((t) => t.vehicleId === vehicleId);
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

export const getGlobalSummary = (vehicles: Vehicle[], transactions: Transaction[]) => {
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

export const syncTripTransactions = async (_trip: Trip): Promise<void> => {
  // Handled on backend to optimize network requests and database updates.
  return;
};

export const generateNextTripNumber = async (): Promise<string> => {
  const trips = await getTrips();
  if (!trips || trips.length === 0) return 'TRP-0001';
  
  // Find highest number
  let maxNum = 0;
  trips.forEach(t => {
    if (t.tripNumber && t.tripNumber.startsWith('TRP-')) {
      const numPart = t.tripNumber.replace('TRP-', '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  
  return `TRP-${String(maxNum + 1).padStart(4, '0')}`;
};

export const exportData = async (): Promise<string> => {
  const data = {
    vehicles: await getVehicles(),
    transactions: await getTransactions(),
    trips: await getTrips()
  };
  return JSON.stringify(data, null, 2);
};

export const importData = async (jsonData: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonData);
    if (data) {
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
      });
      return res.ok;
    }
    return false;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
};

export const initSampleData = async (): Promise<void> => {
  // Not used in API mode since MongoDB acts as the true source
  // We can add logic to seed MongoDB here if needed.
};

export const clearAllData = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/clear`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.ok;
  } catch (e) {
    console.error('Error clearing data', e);
    return false;
  }
};
