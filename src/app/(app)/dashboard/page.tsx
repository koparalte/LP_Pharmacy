
import { QuickStats } from "./components/QuickStats";
import { LowStockSummary } from "./components/LowStockSummary";
import type { InventoryItem, ReportData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

// Mock data for demonstration
// Removed category and supplier from mock data
const mockInventoryItems: InventoryItem[] = [
  { id: "1", name: "Amoxicillin 250mg", description: "Antibiotic", stock: 15, lowStockThreshold: 20, unitPrice: 0.5, expiryDate: "2024-12-31", tags: ["antibiotic", "prescription"], lastUpdated: new Date().toISOString() },
  { id: "2", name: "Ibuprofen 200mg", description: "Pain reliever", stock: 50, lowStockThreshold: 30, unitPrice: 0.2, expiryDate: "2025-06-30", tags: ["otc", "painkiller"], lastUpdated: new Date().toISOString() },
  { id: "3", name: "Vitamin C 1000mg", description: "Supplement", stock: 5, lowStockThreshold: 10, unitPrice: 0.1, tags: ["supplement", "otc"], lastUpdated: new Date().toISOString() },
  { id: "4", name: "Paracetamol 500mg", description: "Pain and fever reducer", stock: 100, lowStockThreshold: 50, unitPrice: 0.15, expiryDate: "2026-01-31", tags: ["otc", "fever"], lastUpdated: new Date().toISOString()},
  { id: "5", name: "Loratadine 10mg", description: "Antihistamine", stock: 25, lowStockThreshold: 15, unitPrice: 0.8, tags: ["otc", "allergy"], lastUpdated: new Date().toISOString() },
];

const mockReportData: ReportData = {
  totalItems: mockInventoryItems.length,
  totalValue: mockInventoryItems.reduce((sum, item) => sum + item.stock * item.unitPrice, 0),
  lowStockItemsCount: mockInventoryItems.filter(item => item.stock <= item.lowStockThreshold).length,
  // categoriesCount is removed from ReportData type, so it's removed here too
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      
      <QuickStats data={mockReportData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockSummary items={mockInventoryItems} />
        
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
