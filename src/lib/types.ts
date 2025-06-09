
export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  supplier: string;
  stock: number;
  lowStockThreshold: number;
  unitPrice: number;
  expiryDate?: string; // YYYY-MM-DD
  tags: string[];
  lastUpdated: string; // ISO DateTime string
};

export type ReportData = {
  totalItems: number;
  totalValue: number;
  lowStockItemsCount: number;
  itemsExpiringSoon?: number;
  categoriesCount?: number;
};

export type StockByCategory = {
  category: string;
  count: number;
};

export type CashoutTransaction = {
  id:string;
  amount: number;
  method: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  date: string; // ISO DateTime string
  notes?: string;
};

export type BillItem = InventoryItem & {
  quantityInBill: number;
};

export type FinalizedBill = {
  id: string; // Unique ID for the bill
  date: string; // ISO DateTime string when the bill was finalized
  items: BillItem[]; // Array of items in the bill
  grandTotal: number; // Total amount of the bill
  customerName: string;
  customerAddress?: string;
};

