
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { FinalizedBill } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinalizedBillsTable } from "./components/FinalizedBillsTable";
import { SalesReportFilters } from "./components/SalesReportFilters";
import { FileText, PackageSearch } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  type DocumentSnapshot,
  deleteDoc, 
  doc, 
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { parseISO, startOfDay, endOfDay } from "date-fns";

const BILLS_PER_PAGE = 10; 

export default function SalesReportPage() {
  const [currentBills, setCurrentBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);

  const [searchTermBillId, setSearchTermBillId] = useState("");
  const [searchTermCustomerName, setSearchTermCustomerName] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "paid" | "debt">("all");

  const fetchBillsPageCallback = useCallback(async (page: number, direction: 'initial' | 'next' | 'prev', currentFirstDoc: DocumentSnapshot | null, currentLastDoc: DocumentSnapshot | null) => {
    setLoading(true);

    // Apply filters to the query
    let baseQuery = query(collection(db, "finalizedBills"), orderBy("date", "desc"));
    const filtersApplied: string[] = [];

    // Filter by Bill ID (Exact match for prefix, case-sensitive for Firestore typically)
    // Firestore doesn't support partial string matches like 'includes' directly in queries
    // for IDs in this manner. This filter will be client-side.
    
    // Filter by Customer Name (Partial match, case-insensitive, client-side)

    // Filter by Status
    if (selectedStatus !== "all") {
      baseQuery = query(baseQuery, where("status", "==", selectedStatus));
      filtersApplied.push(`Status: ${selectedStatus}`);
    }

    // Filter by Date Range
    // Firestore requires date filtering on the same field used for orderBy if it's a range.
    // Since we order by 'date', we can filter by 'date'.
    if (startDate) {
      baseQuery = query(baseQuery, where("date", ">=", startOfDay(startDate).toISOString()));
      filtersApplied.push(`Start Date: ${startDate.toLocaleDateString()}`);
    }
    if (endDate) {
      baseQuery = query(baseQuery, where("date", "<=", endOfDay(endDate).toISOString()));
      filtersApplied.push(`End Date: ${endDate.toLocaleDateString()}`);
    }


    try {
      let q;
      if (direction === 'initial') {
        q = query(baseQuery, limit(BILLS_PER_PAGE));
      } else if (direction === 'next' && currentLastDoc) {
        q = query(baseQuery, startAfter(currentLastDoc), limit(BILLS_PER_PAGE));
      } else if (direction === 'prev' && currentFirstDoc) {
        q = query(baseQuery, endBefore(currentFirstDoc), limitToLast(BILLS_PER_PAGE));
      } else {
        q = query(baseQuery, limit(BILLS_PER_PAGE));
        setCurrentPage(1); 
      }

      const querySnapshot = await getDocs(q);
      let billsData = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as FinalizedBill));

      // Client-side filtering for fields not easily queryable with pagination in Firestore
      if (searchTermBillId) {
        billsData = billsData.filter(bill => bill.id.toLowerCase().includes(searchTermBillId.toLowerCase()));
      }
      if (searchTermCustomerName) {
        billsData = billsData.filter(bill => bill.customerName.toLowerCase().includes(searchTermCustomerName.toLowerCase()));
      }
      
      setCurrentBills(billsData);

      if (querySnapshot.docs.length > 0 && billsData.length > 0) { // Check billsData for client-side filtering
        // If client-side filtering resulted in non-empty array, set docs based on original snapshot for pagination
        setFirstVisibleDoc(querySnapshot.docs[0]);
        setLastVisibleDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        // isLastPage determination might be tricky with client-side filtering.
        // If querySnapshot.docs.length < BILLS_PER_PAGE, it's definitely the last page from DB perspective.
        setIsLastPage(querySnapshot.docs.length < BILLS_PER_PAGE); 
      } else if (querySnapshot.docs.length < BILLS_PER_PAGE) {
         setIsLastPage(true); // No more docs from DB
      } else if (billsData.length === 0 && querySnapshot.docs.length > 0) {
        // Data from DB, but client-side filter made it empty. Not necessarily last page.
        // Consider this "last page *for this filter set*"
        setIsLastPage(false); // Can try fetching more from DB if filters change
      }
      
      if (billsData.length === 0 && page === 1) { // If first page is empty after all filtering
        setFirstVisibleDoc(null);
        setLastVisibleDoc(null);
        // setIsLastPage(true); // Already covered if querySnapshot.docs.length < BILLS_PER_PAGE
      }


    } catch (error: any) {
      console.error("Failed to fetch/filter finalized bills: ", error);
      toast({
        title: "Error Fetching Sales Data",
        description: `Could not load sales transactions. ${error.message}`,
        variant: "destructive",
      });
      setCurrentBills([]); 
    } finally {
      setLoading(false);
    }
  }, [toast, selectedStatus, startDate, endDate, searchTermBillId, searchTermCustomerName]); // Added all filter states as dependencies

  useEffect(() => {
    setCurrentPage(1); 
    setLastVisibleDoc(null); 
    setFirstVisibleDoc(null); 
    fetchBillsPageCallback(1, 'initial', null, null);
  }, [fetchBillsPageCallback]); // fetchBillsPageCallback now includes filter states


  const handleNextPage = () => {
    if (!isLastPage && !loading) {
      setCurrentPage(prev => {
        const nextPage = prev + 1;
        fetchBillsPageCallback(nextPage, 'next', firstVisibleDoc, lastVisibleDoc);
        return nextPage;
      });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      setCurrentPage(prev => {
        const prevPage = prev - 1;
        fetchBillsPageCallback(prevPage, 'prev', firstVisibleDoc, lastVisibleDoc);
        return prevPage;
      });
    }
  };

  const handleBillUpdate = useCallback((updatedBill: FinalizedBill) => {
    setCurrentBills(prevBills =>
      prevBills.map(bill => bill.id === updatedBill.id ? updatedBill : bill)
    );
  }, []);

  const handleDeleteBill = async (billId: string) => {
    if (!billId) return;
    try {
      await deleteDoc(doc(db, "finalizedBills", billId));
      toast({
        title: "Bill Deleted",
        description: `Bill ID ${billId} has been successfully deleted. Refreshing list...`,
      });
      setCurrentPage(1);
      setLastVisibleDoc(null);
      setFirstVisibleDoc(null);
      await fetchBillsPageCallback(1, 'initial', null, null);
    } catch (error) {
      console.error("Error deleting bill: ", error);
      toast({
        title: "Error Deleting Bill",
        description: "Could not delete the bill. Please try again.",
        variant: "destructive",
      });
      throw error; 
    }
  };


  const handleClearFilters = () => {
    setSearchTermBillId("");
    setSearchTermCustomerName("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedStatus("all");
    // useEffect will trigger refetch due to filter state changes
  };

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
            Review completed sales transactions. Customer details can be edited. Bills are loaded page by page. Admins can delete bills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && currentBills.length === 0 ? ( 
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !loading && currentBills.length === 0 ? (
             <div className="flex flex-col items-center justify-center text-center py-12 border rounded-lg bg-card shadow-sm">
                <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Bills Found</h3>
                <p className="text-muted-foreground">
                    No sales transactions match your current filter criteria, or no transactions have been recorded yet for this page.
                </p>
            </div>
          ) : (
            <FinalizedBillsTable 
                bills={currentBills} 
                onBillUpdate={handleBillUpdate}
                onDeleteBill={handleDeleteBill} 
            />
          )}
          {currentBills.length > 0 && ( // Only show pagination if there are bills to display
            <div className="flex items-center justify-end space-x-2 py-4 mt-4 border-t">
                <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1 || loading}
                >
                Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">Page {currentPage}</span>
                <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={isLastPage || loading}
                >
                Next
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
