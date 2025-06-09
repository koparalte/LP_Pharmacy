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
  id: string;
  amount: number;
  method: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  date: string; // ISO DateTime string
  notes?: string;
};
