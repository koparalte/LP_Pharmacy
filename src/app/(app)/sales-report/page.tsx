
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
  deleteDoc, // Added deleteDoc
  doc, // Added doc
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

    try {
      const billsCollectionRef = collection(db, "finalizedBills");
      let q;

      if (direction === 'initial') {
        q = query(billsCollectionRef, orderBy("date", "desc"), limit(BILLS_PER_PAGE));
      } else if (direction === 'next' && currentLastDoc) {
        q = query(billsCollectionRef, orderBy("date", "desc"), startAfter(currentLastDoc), limit(BILLS_PER_PAGE));
      } else if (direction === 'prev' && currentFirstDoc) {
        q = query(billsCollectionRef, orderBy("date", "desc"), endBefore(currentFirstDoc), limitToLast(BILLS_PER_PAGE));
      } else {
        console.warn("Pagination issue or attempting to go to invalid page. Loading page 1.");
        q = query(billsCollectionRef, orderBy("date", "desc"), limit(BILLS_PER_PAGE));
        setCurrentPage(1); 
      }

      const querySnapshot = await getDocs(q);
      const billsData = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as FinalizedBill));

      setCurrentBills(billsData);

      if (querySnapshot.docs.length > 0) {
        setFirstVisibleDoc(querySnapshot.docs[0]);
        setLastVisibleDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setIsLastPage(querySnapshot.docs.length < BILLS_PER_PAGE);
      } else {
        if (direction === 'next') {
          setIsLastPage(true); 
          setCurrentPage(prevPage => Math.max(1, prevPage -1)); 
        } else if (direction === 'initial' || (direction === 'prev' && page === 1)) {
           setIsLastPage(true);
        }
        
        if(billsData.length === 0 && page === 1) {
            setFirstVisibleDoc(null);
            setLastVisibleDoc(null);
        }
      }
    } catch (error: any) {
      console.error("Failed to parse finalized bills from Firestore", error);
      toast({
        title: "Error Fetching Sales Data",
        description: `Could not load sales transactions. ${error.message}`,
        variant: "destructive",
      });
      setCurrentBills([]); 
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setCurrentPage(1); 
    setLastVisibleDoc(null); 
    setFirstVisibleDoc(null); 
    fetchBillsPageCallback(1, 'initial', null, null);
  }, [searchTermBillId, searchTermCustomerName, startDate, endDate, selectedStatus, fetchBillsPageCallback]);


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
      // Refresh to page 1 to ensure data consistency after deletion
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
      throw error; // Re-throw to be caught by the calling component if needed
    }
  };


  const handleClearFilters = () => {
    setSearchTermBillId("");
    setSearchTermCustomerName("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedStatus("all");
  };

  const displayedBills = useMemo(() => {
    return currentBills;
  }, [currentBills]);


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
                bills={displayedBills} 
                onBillUpdate={handleBillUpdate}
                onDeleteBill={handleDeleteBill} 
            />
          )}
          {currentBills.length > 0 && (
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

