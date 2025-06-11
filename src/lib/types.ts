
export type InventoryItem = {
  id: string; // Firestore document ID
  name: string;
  description: string;
  batchNo?: string;
  unit?: string; 
  stock: number;
  lowStockThreshold: number;
  mrp: number; 
  rate: number; 
  expiryDate?: string; // YYYY-MM-DD
  lastUpdated: string; // ISO DateTime string (or Firestore Timestamp if using serverTimestamp)
};

export type ReportData = {
  totalItems: number;
  totalValue: number; 
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
// When saving a finalized bill, BillItem copies these values.
// The `id` in BillItem refers to the original inventory item's Firestore ID for reference.
// It will *not* have stock, lowStockThreshold, etc. as those are inventory-specific.
export type BillItem = {
  id: string; // Corresponds to the InventoryItem's Firestore document ID
  name: string;
  batchNo?: string;
  unit?: string;
  mrp: number; // MRP at the time of sale
  rate: number; // Rate at the time of sale
  quantityInBill: number;
  description?: string; // Optional: if you want to store a snapshot of item description
  expiryDate?: string; // Optional: if you want to store a snapshot of expiry
  // Exclude: stock, lowStockThreshold, lastUpdated from the original InventoryItem type for the BillItem copy
};


export type FinalizedBill = {
  id: string; // Firestore document ID for this bill
  date: string; // ISO DateTime string (or Firestore Timestamp) when the bill was finalized
  items: BillItem[]; 
  grandTotal: number; 
  customerName: string;
  customerAddress?: string;
};
