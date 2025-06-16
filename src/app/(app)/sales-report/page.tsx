
"use client";

import { useState, useEffect, useCallback } from "react";
import type { FinalizedBill } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinalizedBillsTable } from "./components/FinalizedBillsTable";
import { FileText } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const BILLS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export default function SalesReportPage() {
  const [finalizedBills, setFinalizedBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [lastFetchedBills, setLastFetchedBills] = useState<number | null>(null);

  const loadBills = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && lastFetchedBills && (Date.now() - lastFetchedBills < BILLS_STALE_TIME)) {
      setLoading(false); 
      return;
    }
    setLoading(true);
    try {
      const billsCollection = collection(db, "finalizedBills");
      const q = query(billsCollection, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const billsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as FinalizedBill));
      setFinalizedBills(billsList);
      setLastFetchedBills(Date.now());
    } catch (error) {
      console.error("Failed to parse finalized bills from Firestore", error);
      toast({
        title: "Error Fetching Sales Data",
        description: "Could not load sales transactions from the database.",
        variant: "destructive",
      });
      setFinalizedBills([]);
      setLastFetchedBills(null);
    } finally {
      setLoading(false);
    }
  }, [toast, lastFetchedBills]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const handleBillUpdate = useCallback((updatedBill: FinalizedBill) => {
    setFinalizedBills(prevBills =>
      prevBills.map(bill => bill.id === updatedBill.id ? updatedBill : bill)
                 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  }, []);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Sales Report</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Finalized Bills
          </CardTitle>
          <CardDescription>
            Review all completed sales transactions. Customer details can be edited. Bills are marked as 'Paid' or 'Debt'.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <FinalizedBillsTable bills={finalizedBills} onBillUpdate={handleBillUpdate} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
