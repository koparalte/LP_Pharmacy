
export type InventoryItem = {
  id: string; // Firestore document ID
  name: string;
  batchNo?: string;
  unit?: string;
  stock: number;
  lowStockThreshold: number;
  rate: number; // Cost price of the item
  sellingPrice: number; // Actual selling price
  mrp: number;
  expiryDate?: string; // YYYY-MM-DD
  lastUpdated: string; // ISO DateTime string (or Firestore Timestamp if using serverTimestamp)
};

export type ReportData = {
  totalUniqueItems: number;
  totalValue: number; // This will now be based on cost price (rate)
  lowStockItemsCount: number;
  itemsInStockCount: number;
  itemsOutOfStockCount: number;
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

export type BillItem = {
  id: string; // Corresponds to the InventoryItem's Firestore document ID
  name: string;
  batchNo?: string;
  unit?: string;
  rate: number; // Cost price at the time of sale
  sellingPrice: number; // Selling price at the time of sale
  mrp: number; // MRP at the time of sale
  quantityInBill: number;
  expiryDate?: string; // Optional: if you want to store a snapshot of expiry
};


export type FinalizedBill = {
  id: string; // Firestore document ID for this bill
  date: string; // ISO DateTime string (or Firestore Timestamp) when the bill was finalized
  items: BillItem[];
  grandTotal: number;
  customerName: string;
  customerAddress?: string;
};

