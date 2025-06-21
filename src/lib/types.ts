
export type InventoryItem = {
  id: string; // Firestore document ID
  name: string;
  batchNo?: string;
  unit?: string;
  stock: number;
  lowStockThreshold: number;
  rate: number; // Cost price of the item
  mrp: number; // Maximum Retail Price (also the Selling Price)
  expiryDate?: string; // YYYY-MM-DD, effectively represents month/year of expiry
  lastUpdated: string; // ISO DateTime string (or Firestore Timestamp if using serverTimestamp)
};

export type BillInProgressItem = InventoryItem & {
  quantityInBill: number;
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
  mrp: number; // MRP (which is the selling price) at the time of sale
  quantityInBill: number;
  expiryDate?: string; // Optional: if you want to store a snapshot of expiry
};


export type FinalizedBill = {
  id: string; // Firestore document ID for this bill (is the same as billNumber)
  billNumber: string; // Human-readable bill ID, e.g., LP123456 (is the same as id)
  date: string; // ISO DateTime string (or Firestore Timestamp) when the bill was finalized
  items: BillItem[];
  subTotal: number; // Total before discount
  discountAmount: number; // Amount of discount applied
  grandTotal: number; // Total after discount
  customerName: string;
  customerAddress?: string;
  status: 'paid' | 'debt'; 
  amountActuallyPaid: number; // Total amount paid by the customer for this bill
  remainingBalance: number; // grandTotal - amountActuallyPaid
  remarks?: string; // Optional field for remarks, e.g., payment method
};

export type InventoryMovementSource = 
  | 'initial_stock' 
  | 'stock_edit' 
  | 'sale' 
  | 'csv_import';

export type InventoryMovement = {
  eventId: string; // Unique ID for this specific movement event within a daily log
  itemId: string;
  itemName: string; // Denormalized for easier display
  type: 'in' | 'out';
  quantity: number;
  movementDate: string; // YYYY-MM-DD format (date of event)
  source: InventoryMovementSource;
  reason?: string; // e.g., "Sale - Bill ID: LP12345", "Stock adjustment via edit"
  recordedAt: string; // ISO DateTime string of when the record was made
  movedByUserId: string; // ID of the user who performed the action
  movedByUserName?: string; // Display name or email of the user
};

export type DailyMovementLog = {
  id: string; // Document ID, YYYY-MM-DD
  date: string; // YYYY-MM-DD, same as ID
  movements: InventoryMovement[];
  lastUpdated: string; // ISO DateTime string of the last update to this daily log document
};

// Neutralize problematic sales report page
// src/app/(app/sales-report/page.tsx
export {};
