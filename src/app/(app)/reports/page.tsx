
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { FinalizedBill } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  getDocs,
  type DocumentSnapshot,
  type QueryConstraint,
  getDoc,
  doc
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesReportFilters, type ReportFiltersState } from "./components/SalesReportFilters";
import { FinalizedBillsTable } from "./components/FinalizedBillsTable";
import { FileText, SearchSlash } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

const ITEMS_PER_PAGE = 15;
const SALES_REPORT_STALE_TIME = 2 * 60 * 1000; // 2 minutes

export default function SalesReportPage() {
  const [bills, setBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [lastFetchedTime, setLastFetchedTime] = useState<number | null>(null);

  const [filters, setFilters] = useState<ReportFiltersState>({
    dateRange: { from: undefined, to: undefined },
    status: "all",
    searchTerm: "",
    searchType: "billId",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [pageDirection, setPageDirection] = useState<'initial' | 'next' | 'prev'>('initial');
  const [isLastPage, setIsLastPage] = useState(false);
  const [docSnapshotsPerPage, setDocSnapshotsPerPage] = useState<Record<number, {first: DocumentSnapshot | null, last: DocumentSnapshot | null}>>({});


  const fetchFinalizedBills = useCallback(async (
    currentFilters: ReportFiltersState,
    page: number,
    direction: 'initial' | 'next' | 'prev',
    pFirstDoc: DocumentSnapshot | null,
    pLastDoc: DocumentSnapshot | null
  ) => {
    setLoading(true);
    
    // Bill ID direct fetch
    if (currentFilters.searchTerm && currentFilters.searchType === 'billId') {
      try {
        const billDocRef = doc(db, "finalizedBills", currentFilters.searchTerm.trim());
        const billDocSnap = await getDoc(billDocRef);
        if (billDocSnap.exists()) {
          setBills([{ id: billDocSnap.id, ...billDocSnap.data() } as FinalizedBill]);
          setIsLastPage(true);
          setCurrentPage(1);
          setFirstVisibleDoc(null);
          setLastVisibleDoc(null);
          setDocSnapshotsPerPage({});
        } else {
          setBills([]);
          toast({ title: "Not Found", description: `Bill with ID '${currentFilters.searchTerm}' not found.`});
          setIsLastPage(true);
        }
      } catch (error) {
        console.error("Error fetching bill by ID: ", error);
        toast({ title: "Error", description: "Could not fetch bill by ID.", variant: "destructive" });
        setBills([]);
      } finally {
        setLoading(false);
      }
      return;
    }


    try {
      const billsCollection = collection(db, "finalizedBills");
      const queryConstraints: QueryConstraint[] = [];

      // Date Range Filter
      if (currentFilters.dateRange?.from) {
        queryConstraints.push(where("date", ">=", format(startOfDay(currentFilters.dateRange.from), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")));
      }
      if (currentFilters.dateRange?.to) {
        queryConstraints.push(where("date", "<=", format(endOfDay(currentFilters.dateRange.to), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")));
      }

      // Status Filter
      if (currentFilters.status && currentFilters.status !== "all") {
        queryConstraints.push(where("status", "==", currentFilters.status));
      }
      
      queryConstraints.push(orderBy("date", "desc"));

      if (direction === 'next' && pLastDoc) {
        queryConstraints.push(startAfter(pLastDoc));
      } else if (direction === 'prev' && pFirstDoc) {
        queryConstraints.push(endBefore(pFirstDoc));
        queryConstraints.push(limitToLast(ITEMS_PER_PAGE));
      } else {
         queryConstraints.push(limit(ITEMS_PER_PAGE));
      }
      
      const q = query(billsCollection, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      const fetchedBills = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as FinalizedBill));

      setBills(fetchedBills);
      
      const newFirstDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[0] : null;
      const newLastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

      if (direction === 'initial') {
        setDocSnapshotsPerPage({ 1: { first: newFirstDoc, last: newLastDoc } });
      } else if (direction === 'next') {
        setDocSnapshotsPerPage(prev => ({ ...prev, [page]: { first: newFirstDoc, last: newLastDoc }}));
      }
      // For 'prev', we don't need to update snapshots as we are navigating to an already known page state.

      setFirstVisibleDoc(newFirstDoc);
      setLastVisibleDoc(newLastDoc);
      
      if (direction === 'prev') {
         setIsLastPage(false); // If we successfully went prev, we are not on the last page.
      } else {
         setIsLastPage(fetchedBills.length < ITEMS_PER_PAGE);
      }
      
      setLastFetchedTime(Date.now());

    } catch (error) {
      console.error("Error fetching finalized bills: ", error);
      toast({ title: "Error", description: "Could not fetch sales reports.", variant: "destructive" });
      setBills([]);
      setFirstVisibleDoc(null);
      setLastVisibleDoc(null);
      setIsLastPage(true);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const now = Date.now();
    const isCacheStale = !lastFetchedTime || (now - lastFetchedTime > SALES_REPORT_STALE_TIME);
    
    if (pageDirection === 'initial' && isCacheStale) {
      fetchFinalizedBills(filters, 1, 'initial', null, null);
    } else if (pageDirection === 'initial' && !isCacheStale && bills.length === 0) {
      // If initial load, cache is not stale, but no bills are shown (e.g. after filter reset)
      fetchFinalizedBills(filters, 1, 'initial', null, null);
    } else if (pageDirection === 'initial' && !isCacheStale){
       setLoading(false); // Data is fresh and already loaded
    }
  }, [filters, fetchFinalizedBills, lastFetchedTime, pageDirection, bills.length]);


  const handleFilterChange = (newFilters: ReportFiltersState) => {
    setCurrentPage(1);
    setFilters(newFilters);
    setPageDirection('initial');
    setFirstVisibleDoc(null);
    setLastVisibleDoc(null);
    setDocSnapshotsPerPage({});
    // Fetching will be triggered by useEffect due to filters change
  };
  
  const handleNextPage = () => {
    if (!isLastPage && !loading) {
      setPageDirection('next');
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchFinalizedBills(filters, nextPage, 'next', firstVisibleDoc, lastVisibleDoc);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      setPageDirection('prev');
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      const prevPageSnapshots = docSnapshotsPerPage[prevPage];
      fetchFinalizedBills(filters, prevPage, 'prev', prevPageSnapshots?.first || null, prevPageSnapshots?.last || null);
    }
  };

  const filteredClientSideBills = useMemo(() => {
    if (!filters.searchTerm || filters.searchType !== 'customerName') return bills;
    return bills.filter(bill =>
      bill.customerName.toLowerCase().includes(filters.searchTerm.toLowerCase())
    );
  }, [bills, filters.searchTerm, filters.searchType]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" />
          Sales Report
        </h1>
      </div>

      <SalesReportFilters onFilterChange={handleFilterChange} initialFilters={filters} />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : filteredClientSideBills.length > 0 ? (
        <FinalizedBillsTable bills={filteredClientSideBills} />
      ) : (
        <Card className="flex flex-col items-center justify-center py-12">
          <SearchSlash className="h-16 w-16 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">No Sales Found</CardTitle>
          <CardDescription>
            No sales match your current filter criteria, or there are no sales recorded yet.
          </CardDescription>
        </Card>
      )}
      
      {!loading && bills.length > 0 && !(filters.searchTerm && filters.searchType === 'billId') && (
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
    </div>
  );
}
