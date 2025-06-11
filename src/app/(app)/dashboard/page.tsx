
"use client";
import { QuickStats } from "./components/QuickStats";
import { LowStockSummary } from "./components/LowStockSummary";
import type { InventoryItem, ReportData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useEffect, useState } from "react";

const INVENTORY_STORAGE_KEY = 'lpPharmacyInventory';

const fallbackMockInventoryItems: InventoryItem[] = [
  { id: "1", name: "Amoxicillin 250mg", batchNo: "AMX250-D001", unit: "strip", description: "Antibiotic", stock: 15, lowStockThreshold: 20, mrp: 50.0, rate: 45.0, expiryDate: "2024-12-31", lastUpdated: new Date().toISOString() },
  { id: "2", name: "Ibuprofen 200mg", batchNo: "IBU200-D002", unit: "bottle", description: "Pain reliever", stock: 50, lowStockThreshold: 30, mrp: 20.0, rate: 18.0, expiryDate: "2025-06-30", lastUpdated: new Date().toISOString() },
  { id: "3", name: "Vitamin C 1000mg", unit: "tube", description: "Supplement", stock: 5, lowStockThreshold: 10, mrp: 10.0, rate: 8.0, lastUpdated: new Date().toISOString() },
  { id: "4", name: "Paracetamol 500mg", batchNo: "PAR500-D003", unit: "strip", description: "Pain and fever reducer", stock: 100, lowStockThreshold: 50, mrp: 15.0, rate: 12.0, expiryDate: "2026-01-31", lastUpdated: new Date().toISOString()},
  { id: "5", name: "Loratadine 10mg", unit: "pcs", description: "Antihistamine", stock: 25, lowStockThreshold: 15, mrp: 80.0, rate: 75.0, lastUpdated: new Date().toISOString() },
];


export default function DashboardPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [reportData, setReportData] = useState<ReportData>({
    totalItems: 0,
    totalValue: 0,
    lowStockItemsCount: 0,
  });

  useEffect(() => {
    let storedInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);
    let itemsToUse: InventoryItem[];
    if (storedInventory) {
      try {
        const parsed = JSON.parse(storedInventory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          itemsToUse = parsed;
        } else {
          itemsToUse = fallbackMockInventoryItems;
          localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(itemsToUse));
        }
      } catch (e) {
        console.error("Failed to parse inventory from localStorage for dashboard", e);
        itemsToUse = fallbackMockInventoryItems;
        localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(itemsToUse));
      }
    } else {
      itemsToUse = fallbackMockInventoryItems;
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(itemsToUse));
    }
    setInventoryItems(itemsToUse);

    const newReportData: ReportData = {
      totalItems: itemsToUse.length,
      totalValue: itemsToUse.reduce((sum, item) => sum + item.stock * item.rate, 0), // Use rate for total value
      lowStockItemsCount: itemsToUse.filter(item => item.stock <= item.lowStockThreshold).length,
    };
    setReportData(newReportData);

  }, []);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      
      <QuickStats data={reportData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockSummary items={inventoryItems} />
        
        <Card>
          <CardHeader>
            <CardTitle>Welcome to LP Pharmacy Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Manage your pharmacy's inventory efficiently and effectively. Use the navigation to track stock, add new items, and generate reports.</p>
            <Image 
              src="https://placehold.co/600x300.png" 
              alt="Pharmacy illustration" 
              width={600} 
              height={300} 
              className="rounded-md object-cover"
              data-ai-hint="pharmacy interior" 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
