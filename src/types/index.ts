export interface Vehicle {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  ownerName: string;
  type: string; // e.g. "6-Wheeler Truck", "10-Wheeler", "Dumper", "Tanker"
  status: 'Active' | 'Maintenance';
  addedAt: string;
}

export type TransactionCategory =
  // Income categories
  | 'Freight Booking'
  | 'Loading/Unloading'
  | 'Demurrage (Waiting Charges)'
  | 'Other Income'
  // Expense categories
  | 'Diesel / Fuel'
  | 'Toll Charges'
  | 'Driver Salary / Batta'
  | 'Maintenance & Repairs'
  | 'Tyre Expense'
  | 'RTO / Challan / Fine'
  | 'Insurance / Tax / Permit'
  | 'Loading/Unloading Labour'
  | 'Office/Admin Expense'
  | 'Other Expense';

export interface Transaction {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  category: TransactionCategory;
  amount: number;
  paymentMode: 'Cash' | 'Bank' | 'UPI' | 'Pending';
  description: string;
  evidence?: string; // Base64 data URL
  evidenceName?: string; // Name of file
  wasPending?: boolean; // Cleared from pending status flag
  tripId?: string; // Originating trip ID if synced from trip module
}

export interface VehicleSummary {
  vehicleId: string;
  vehicleNumber: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface Trip {
  id: string;
  tripNumber: string;
  date: string;
  vehicleId: string;
  driverName: string;
  customerName: string;
  product: string;
  quantity: number;
  ton: number;
  ratePerTon: number;
  fromLocation: string;
  toLocation: string;
  mobileNumber: string;
  status: 'Running' | 'Completed' | 'Cancelled';
  remarks: string;

  // Income entries
  freightCharges: number;
  totalIncome: number;

  // Expense entries (Deprecated flat fields preserved for data migrations)
  diesel?: number;
  tollTax?: number;
  driverAdvance?: number;
  driverSalary?: number;
  helperExpense?: number;
  loadingExpense?: number;
  unloadingExpense?: number;
  parking?: number;
  repairMaintenance?: number;
  tyreExpense?: number;
  puncture?: number;
  foodExpense?: number;
  miscellaneousExpense?: number;
  totalExpense: number;
  expenses: TripExpense[];

  // Summary
  netProfit: number;


  // Payment details
  advanceReceived: number;
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  paymentMode: 'Cash' | 'Bank' | 'UPI' | 'Pending';
  paymentDate: string;
  pendingAmount?: number;

  // Supporting documents
  evidence?: string;
  evidenceName?: string;
}

export interface TripExpense {
  id: string;
  date: string;
  category: 
    | 'Diesel'
    | 'Toll Tax'
    | 'Driver Advance'
    | 'Driver Salary'
    | 'Helper Expense'
    | 'Loading Expense'
    | 'Unloading Expense'
    | 'Parking'
    | 'Repair & Maintenance'
    | 'Tyre Expense'
    | 'Puncture'
    | 'Food Expense'
    | 'Miscellaneous Expense';
  amount: number;
  remarks: string;
}
