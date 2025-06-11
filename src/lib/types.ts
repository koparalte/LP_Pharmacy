
export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  batchNo?: string;
  unit?: string; // e.g., strips, bottle, pcs
  stock: number;
  lowStockThreshold: number;
  mrp: number; // Renamed from unitPrice
  rate: number; // New field for actual selling rate
  expiryDate?: string; // YYYY-MM-DD
  lastUpdated: string; // ISO DateTime string
};

export type ReportData = {
  totalItems: number;
  totalValue: number; // Will be calculated using 'rate'
  lowStockItemsCount: number;
  itemsExpiringSoon?: number;
};

export type CashoutTransaction = {
  id:string;
  amount: number;
  method: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  date: string; // ISO DateTime string
  notes?: string;
};

// BillItem will inherit mrp and rate from InventoryItem
export type BillItem = InventoryItem & {
  quantityInBill: number;
};

export type FinalizedBill = {
  id: string; // Unique ID for the bill
  date: string; // ISO DateTime string when the bill was finalized
  items: BillItem[]; // Array of items in the bill, each will have mrp and rate
  grandTotal: number; // Total amount of the bill, calculated using 'rate'
  customerName: string;
  customerAddress?: string;
};
