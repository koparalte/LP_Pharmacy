
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText } from "lucide-react";
import type { FinalizedBill } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  type DocumentSnapshot,
} from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { FinalizedBillsTable } from "./components/FinalizedBillsTable";

const BILLS_PER_PAGE = 20;

export default function SalesReportPage() {
  const [finalizedBills, setFinalizedBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  
  const fetchBillsPage = useCallback(async (
    page: number,
    direction: 'initial' | 'next' | 'prev',
    currentFirstDoc: DocumentSnapshot | null,
    currentLastDoc: DocumentSnapshot | null
  ) => {
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
        q = query(billsCollectionRef, orderBy("date", "desc"), limit(BILLS_PER_PAGE));
        setCurrentPage(1); 
      }

      const querySnapshot = await getDocs(q);
      const billsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            billNumber: doc.id,
            ...data,
        } as FinalizedBill
      });
      
      setFinalizedBills(billsList);

      if (querySnapshot.docs.length > 0) {
        setFirstVisibleDoc(querySnapshot.docs[0]);
        setLastVisibleDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setIsLastPage(querySnapshot.docs.length < BILLS_PER_PAGE);
      } else {
        if (direction === 'next') {
          setIsLastPage(true);
          setCurrentPage(prevPage => Math.max(1, prevPage)); // Stay on current page if next is empty
        } else {
          setIsLastPage(true);
        }

        if(billsList.length === 0 && page === 1) {
            setFirstVisibleDoc(null);
            setLastVisibleDoc(null);
        }
      }
    } catch (error) {
      console.error("Error fetching finalized bills: ", error);
      toast({
        title: "Error Fetching Bills",
        description: "Could not load sales data. This might be due to a missing database index. Please check the browser console for a link to create it.",
        variant: "destructive",
      });
      setFinalizedBills([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchBillsPage(1, 'initial', null, null);
  }, [fetchBillsPage]);
  
  const handleNextPage = () => {
    if (!isLastPage && !loading) {
      setCurrentPage(prev => {
        const nextPage = prev + 1;
        fetchBillsPage(nextPage, 'next', firstVisibleDoc, lastVisibleDoc);
        return nextPage;
      });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      setCurrentPage(prev => {
        const prevPage = prev - 1;
        fetchBillsPage(prevPage, 'prev', firstVisibleDoc, lastVisibleDoc);
        return prevPage;
      });
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" />
          Sales Reports
        </h1>
        <div className="flex gap-2">
          <Button asChild size="lg">
            <Link href="/billing">
              <PlusCircle className="mr-2 h-5 w-5" /> Go to Billing
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <FinalizedBillsTable bills={finalizedBills} />
      )}

      {!loading && finalizedBills.length > 0 && (
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
