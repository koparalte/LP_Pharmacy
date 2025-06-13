
export type InventoryItem = {
  id: string; // Firestore document ID
  name: string;
  batchNo?: string;
  unit?: string; 
  stock: number;
  lowStockThreshold: number;
  costPrice: number; // Cost price of the item
  rate: number; 
  mrp: number; 
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

export type BillItem = {
  id: string; // Corresponds to the InventoryItem's Firestore document ID
  name: string;
  batchNo?: string;
  unit?: string;
  costPrice: number; // Cost price at the time of sale
  mrp: number; // MRP at the time of sale
  rate: number; // Rate at the time of sale
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
