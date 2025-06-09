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
};

export type StockByCategory = {
  category: string;
  count: number;
};
