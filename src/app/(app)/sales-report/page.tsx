
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { FinalizedBill } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinalizedBillsTable } from "./components/FinalizedBillsTable";
import { SalesReportFilters } from "./components/SalesReportFilters"; // New import
import { FileText, PackageSearch } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { parseISO, startOfDay, endOfDay } from "date-fns";


const BILLS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export default function SalesReportPage() {
  const [finalizedBills, setFinalizedBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [lastFetchedBills, setLastFetchedBills] = useState<number | null>(null);

  // State for filters
  const [searchTermBillId, setSearchTermBillId] = useState("");
  const [searchTermCustomerName, setSearchTermCustomerName] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "paid" | "debt">("all");

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

  const handleClearFilters = () => {
    setSearchTermBillId("");
    setSearchTermCustomerName("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedStatus("all");
  };

  const displayedBills = useMemo(() => {
    return finalizedBills.filter(bill => {
      // Bill ID search
      if (searchTermBillId && !bill.id.toLowerCase().includes(searchTermBillId.toLowerCase())) {
        return false;
      }
      // Customer Name search
      if (searchTermCustomerName && !bill.customerName.toLowerCase().includes(searchTermCustomerName.toLowerCase())) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "all" && bill.status !== selectedStatus) {
        return false;
      }
      // Date range filter
      try {
        const billDate = parseISO(bill.date);
        if (startDate && billDate < startOfDay(startDate)) {
          return false;
        }
        if (endDate && billDate > endOfDay(endDate)) {
          return false;
        }
      } catch (e) {
        // If date parsing fails, include it by default or log error. For now, include.
        console.warn("Could not parse bill date for filtering:", bill.id, bill.date);
      }
      return true;
    });
  }, [finalizedBills, searchTermBillId, searchTermCustomerName, startDate, endDate, selectedStatus]);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Sales Report</h1>
      
      <SalesReportFilters
        searchTermBillId={searchTermBillId}
        setSearchTermBillId={setSearchTermBillId}
        searchTermCustomerName={searchTermCustomerName}
        setSearchTermCustomerName={setSearchTermCustomerName}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        onClearFilters={handleClearFilters}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Finalized Bills
          </CardTitle>
          <CardDescription>
            Review all completed sales transactions. Use the filters above to refine your search. Customer details can be edited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : displayedBills.length > 0 ? (
            <FinalizedBillsTable bills={displayedBills} onBillUpdate={handleBillUpdate} />
          ) : (
             <div className="flex flex-col items-center justify-center text-center py-12 border rounded-lg bg-card shadow-sm">
                <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Bills Found</h3>
                <p className="text-muted-foreground">
                    No sales transactions match your current filter criteria, or no transactions have been recorded yet.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
