
"use client"; 

import { useState, useEffect } from "react";
// StockLevelChart import removed as it's no longer used
import { ReportSummary } from "./components/ReportSummary";
// StockByCategory type import removed
import type { InventoryItem, ReportData } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

// Mock data fetching and processing.
// Removed logic for stockByCategory and categoriesCount
const getMockData = (): { inventory: InventoryItem[], report: ReportData } => {
  const mockInventoryItems: InventoryItem[] = JSON.parse(localStorage.getItem('lpPharmacyInventory') || '[]') as InventoryItem[];
  
  if (mockInventoryItems.length === 0) { 
     mockInventoryItems.push(
        { id: "1", name: "Amoxicillin 250mg", description: "Antibiotic", stock: 15, lowStockThreshold: 20, unitPrice: 0.5, expiryDate: "2024-12-31", tags: ["antibiotic", "prescription"], lastUpdated: new Date().toISOString() },
        { id: "2", name: "Ibuprofen 200mg", description: "Pain reliever", stock: 50, lowStockThreshold: 30, unitPrice: 0.2, expiryDate: "2025-06-30", tags: ["otc", "painkiller"], lastUpdated: new Date().toISOString() },
        { id: "3", name: "Vitamin C 1000mg", description: "Supplement", stock: 5, lowStockThreshold: 10, unitPrice: 0.1, tags: ["supplement", "otc"], lastUpdated: new Date().toISOString() },
     );
  }

  const reportData: ReportData = {
    totalItems: mockInventoryItems.length,
    totalValue: mockInventoryItems.reduce((sum, item) => sum + item.stock * item.unitPrice, 0),
    lowStockItemsCount: mockInventoryItems.filter(item => item.stock <= item.lowStockThreshold).length,
  };
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const itemsExpiringSoon = mockInventoryItems.filter(item => {
    if (!item.expiryDate) return false;
    const expiry = new Date(item.expiryDate);
    return expiry <= thirtyDaysFromNow && expiry >= new Date();
  }).length;

  // categoriesCount removed
  return { 
    inventory: mockInventoryItems, 
    report: { ...reportData, itemsExpiringSoon }, 
    // stockByCategory: stockByCategoryData // Removed
  };
};


export default function ReportsPage() {
  // categoriesCount removed from reportData state
  const [reportData, setReportData] = useState<ReportData & { itemsExpiringSoon?: number }>({
    totalItems: 0, totalValue: 0, lowStockItemsCount: 0, itemsExpiringSoon: 0
  });
  // stockByCategory state removed
  // const [stockByCategory, setStockByCategory] = useState<StockByCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getMockData();
    setReportData(data.report);
    // setStockByCategory(data.stockByCategory); // Removed
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading report data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Inventory Reports</h1>
      
      <ReportSummary data={reportData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* StockLevelChart removed */}
        <Card className="lg:col-span-2"> {/* Placeholder card can now take full width if needed */}
          <CardHeader>
            <CardTitle>Future Report Enhancements</CardTitle>
            <CardDescription>More detailed reports and analytics will be available here.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
             <Image 
              src="https://placehold.co/400x200.png" 
              alt="Placeholder chart for stock history" 
              width={400} 
              height={200} 
              className="rounded-md object-cover"
              data-ai-hint="line graph analytics" 
            />
            <p className="mt-4 text-muted-foreground">Additional reporting features will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
