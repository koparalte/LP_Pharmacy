
"use client"; 

import { useState, useEffect, useCallback } from "react";
import { ReportSummary } from "./components/ReportSummary";
import type { InventoryItem, ReportData } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";


export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData & { itemsExpiringSoon?: number }>({
    totalItems: 0, totalValue: 0, lowStockItemsCount: 0, itemsExpiringSoon: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const inventoryCollection = collection(db, "inventory");
      const q = query(inventoryCollection);
      const querySnapshot = await getDocs(q);
      const itemsToUse = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as InventoryItem));

      const newReportData: ReportData = {
        totalItems: itemsToUse.length,
        totalValue: itemsToUse.reduce((sum, item) => sum + item.stock * item.rate, 0),
        lowStockItemsCount: itemsToUse.filter(item => item.stock <= item.lowStockThreshold).length,
      };
      
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const itemsExpiringSoon = itemsToUse.filter(item => {
        if (!item.expiryDate) return false;
        try {
            const expiry = new Date(item.expiryDate);
            return expiry <= thirtyDaysFromNow && expiry >= new Date();
        } catch (e) {
            console.error("Invalid date format for item:", item.name, item.expiryDate);
            return false;
        }
      }).length;

      setReportData({ ...newReportData, itemsExpiringSoon });

    } catch (error) {
      console.error("Error fetching inventory for reports: ", error);
      toast({
        title: "Error Fetching Report Data",
        description: "Could not load report data from the database.",
        variant: "destructive",
      });
      setReportData({ totalItems: 0, totalValue: 0, lowStockItemsCount: 0, itemsExpiringSoon: 0 });
    } finally {
      setLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Inventory Reports</h1>
      
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full md:col-span-1 lg:col-span-1" />
        </div>
      ) : (
        <ReportSummary data={reportData} />
      )}
      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2"> 
          <CardHeader>
            <CardTitle>Future Report Enhancements</CardTitle>
            <CardDescription>More detailed reports and analytics will be available here.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
             {loading ? (
                <Skeleton className="h-[200px] w-[400px] rounded-md" />
             ) : (
                <Image 
                src="https://placehold.co/400x200.png" 
                alt="Placeholder chart for stock history" 
                width={400} 
                height={200} 
                className="rounded-md object-cover"
                data-ai-hint="line graph analytics" 
                />
             )}
            <p className="mt-4 text-muted-foreground">Additional reporting features will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
