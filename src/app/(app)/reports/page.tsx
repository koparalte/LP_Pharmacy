
"use client"; 

import { useState, useEffect } from "react";
import { ReportSummary } from "./components/ReportSummary";
import type { InventoryItem, ReportData } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

const INVENTORY_STORAGE_KEY = 'lpPharmacyInventory';

const fallbackInventoryItemsForReport: InventoryItem[] = [
    { id: "rfb1", name: "Amoxicillin 250mg", batchNo: "RFBAMX001", unit: "strip", description: "Antibiotic", stock: 15, lowStockThreshold: 20, unitPrice: 0.5, expiryDate: "2024-12-31", lastUpdated: new Date().toISOString() },
    { id: "rfb2", name: "Ibuprofen 200mg", batchNo: "RFBIBU002", unit: "bottle", description: "Pain reliever", stock: 50, lowStockThreshold: 30, unitPrice: 0.2, expiryDate: "2025-06-30", lastUpdated: new Date().toISOString() },
    { id: "rfb3", name: "Vitamin C 1000mg", unit: "tube", description: "Supplement", stock: 5, lowStockThreshold: 10, unitPrice: 0.1, lastUpdated: new Date().toISOString() },
];

const getReportData = (): ReportData & { itemsExpiringSoon?: number } => {
  let itemsToUse: InventoryItem[];
  const storedInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);

  if (storedInventory) {
      try {
        const parsed = JSON.parse(storedInventory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          itemsToUse = parsed;
        } else {
          itemsToUse = fallbackInventoryItemsForReport;
        }
      } catch (e) {
        console.error("Failed to parse inventory from localStorage for reports", e);
        itemsToUse = fallbackInventoryItemsForReport;
      }
    } else {
      itemsToUse = fallbackInventoryItemsForReport;
    }
  
  const reportData: ReportData = {
    totalItems: itemsToUse.length,
    totalValue: itemsToUse.reduce((sum, item) => sum + item.stock * item.unitPrice, 0),
    lowStockItemsCount: itemsToUse.filter(item => item.stock <= item.lowStockThreshold).length,
  };
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const itemsExpiringSoon = itemsToUse.filter(item => {
    if (!item.expiryDate) return false;
    try {
        const expiry = new Date(item.expiryDate);
        return expiry <= thirtyDaysFromNow && expiry >= new Date();
    } catch (e)
        console.error("Invalid date format for item:", item.name, item.expiryDate);
        return false;
    }
  }).length;

  return { ...reportData, itemsExpiringSoon };
};


export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData & { itemsExpiringSoon?: number }>({
    totalItems: 0, totalValue: 0, lowStockItemsCount: 0, itemsExpiringSoon: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getReportData();
    setReportData(data);
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
        <Card className="lg:col-span-2"> 
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
