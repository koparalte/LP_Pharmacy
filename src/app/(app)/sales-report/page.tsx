
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

export default function SalesReportPage() {
  const [finalizedBills, setFinalizedBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadBills = useCallback(async () => {
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
    } catch (error) {
      console.error("Failed to parse finalized bills from Firestore", error);
      toast({
        title: "Error Fetching Sales Data",
        description: "Could not load sales transactions from the database.",
        variant: "destructive",
      });
      setFinalizedBills([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
            Review all completed sales transactions. Customer details can be edited.
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
