
"use client";
import { QuickStats } from "./components/QuickStats";
import { LowStockSummary } from "./components/LowStockSummary";
import type { InventoryItem, ReportData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";


export default function DashboardPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [reportData, setReportData] = useState<ReportData>({
    totalItems: 0,
    totalValue: 0,
    lowStockItemsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const inventoryCollection = collection(db, "inventory");
      // Optional: Add orderBy for consistency, e.g., orderBy("name")
      const q = query(inventoryCollection); 
      const querySnapshot = await getDocs(q);
      const itemsToUse = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as InventoryItem));
      
      setInventoryItems(itemsToUse);

      const newReportData: ReportData = {
        totalItems: itemsToUse.length,
        totalValue: itemsToUse.reduce((sum, item) => sum + item.stock * item.rate, 0),
        lowStockItemsCount: itemsToUse.filter(item => item.stock <= item.lowStockThreshold).length,
      };
      setReportData(newReportData);

    } catch (error) {
      console.error("Error fetching inventory for dashboard: ", error);
      toast({
        title: "Error Fetching Data",
        description: "Could not load dashboard data from the database.",
        variant: "destructive",
      });
       setInventoryItems([]);
       setReportData({ totalItems: 0, totalValue: 0, lowStockItemsCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <QuickStats data={reportData} />
      )}
      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
           <Skeleton className="h-64 w-full" />
        ) : (
           <LowStockSummary items={inventoryItems} />
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Welcome to LP Pharmacy Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Manage your pharmacy's inventory efficiently and effectively. Use the navigation to track stock, add new items, and generate reports.</p>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-md" />
            ) : (
              <Image 
                src="https://placehold.co/600x300.png" 
                alt="Pharmacy illustration" 
                width={600} 
                height={300} 
                className="rounded-md object-cover"
                data-ai-hint="pharmacy interior" 
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
