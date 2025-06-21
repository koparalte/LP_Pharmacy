
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText, Trash2, Loader2, FileDown } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { batchDeleteBills } from "@/lib/billService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";

const BILLS_PER_PAGE = 20;

export default function SalesReportPage() {
  const [finalizedBills, setFinalizedBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { isAdmin, loading: authLoading } = useAuth();

  const fetchBillsPage = useCallback(async (
    page: number,
    direction: 'initial' | 'next' | 'prev',
    currentFirstDoc: DocumentSnapshot | null,
    currentLastDoc: DocumentSnapshot | null
  ) => {
    setLoading(true);
    setSelectedBillIds([]); // Clear selection on page change

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

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await batchDeleteBills(selectedBillIds);
      if (result.success) {
        toast({
          title: "Bills Deleted",
          description: result.message,
        });
        setSelectedBillIds([]);
        // Refetch from page 1 to ensure consistency after deletion
        setCurrentPage(1);
        setLastVisibleDoc(null);
        setFirstVisibleDoc(null);
        await fetchBillsPage(1, 'initial', null, null);
      } else {
        toast({
          title: "Deletion Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Batch deletion error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during deletion.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let billsToExport: FinalizedBill[] = [];
      let fileNameBase = "All_Sales";

      if (selectedBillIds.length > 0) {
        toast({
          title: "Starting Export...",
          description: `Preparing ${selectedBillIds.length} selected bill(s).`
        });
        billsToExport = finalizedBills.filter(bill => selectedBillIds.includes(bill.id));
        fileNameBase = "Selected_Sales";
      } else {
        toast({
          title: "Starting Export...",
          description: "Fetching all sales data. This may take a moment."
        });
        const billsCollectionRef = collection(db, "finalizedBills");
        const q = query(billsCollectionRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          toast({
            title: "No Data to Export",
            description: "There are no sales reports to export.",
          });
          setIsExporting(false);
          return;
        }

        billsToExport = querySnapshot.docs.map(doc => ({
          id: doc.id,
          billNumber: doc.id,
          ...doc.data(),
        } as FinalizedBill));
      }

      if (billsToExport.length === 0) {
        toast({
          title: "No Bills to Export",
          description: "No data found for the export operation.",
          variant: "destructive"
        });
        setIsExporting(false);
        return;
      }

      const exportData: any[] = [];
      billsToExport.forEach(bill => {
        if (bill.items && bill.items.length > 0) {
          bill.items.forEach(item => {
            exportData.push({
              "Bill Number": bill.billNumber,
              "Bill Date": format(parseISO(bill.date), "yyyy-MM-dd HH:mm:ss"),
              "Customer Name": bill.customerName,
              "Customer Address": bill.customerAddress || 'N/A',
              "Bill Status": bill.status,
              "Item Name": item.name,
              "Item Quantity": item.quantityInBill,
              "Item MRP (₹)": item.mrp,
              "Item Rate (Cost) (₹)": item.rate,
              "Item Total (₹)": item.mrp * item.quantityInBill,
              "Bill Subtotal (₹)": bill.subTotal,
              "Bill Discount (₹)": bill.discountAmount,
              "Bill Grand Total (₹)": bill.grandTotal,
              "Bill Amount Paid (₹)": bill.amountActuallyPaid,
              "Bill Remaining Balance (₹)": bill.remainingBalance,
              "Bill Remarks": bill.remarks || 'N/A',
            });
          });
        }
      });
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
      
      const colWidths = Object.keys(exportData[0]).map(key => {
          const maxWidth = exportData.reduce((w, r) => Math.max(w, (r[key]?.toString() || '').length), key.length);
          return { wch: maxWidth + 2 };
      });
      worksheet["!cols"] = colWidths;

      const fileName = `LP_Pharmacy_${fileNameBase}_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Export Complete",
        description: `${billsToExport.length} bills have been exported to ${fileName}.`
      });

    } catch (error) {
      console.error("Error exporting sales data: ", error);
      toast({
        title: "Export Failed",
        description: "Could not export sales data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
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
          {!authLoading && isAdmin && selectedBillIds.length > 0 && (
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete ({selectedBillIds.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete the selected {selectedBillIds.length} bill(s). This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBatchDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? "Deleting..." : "Yes, delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={handleExport} disabled={isExporting || loading} size="lg" variant="outline">
            {isExporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileDown className="mr-2 h-5 w-5" />}
            {selectedBillIds.length > 0 ? `Export Selected (${selectedBillIds.length})` : "Export All as XLSX"}
          </Button>
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
        <FinalizedBillsTable
          bills={finalizedBills}
          isAdmin={!authLoading && isAdmin}
          selectedBillIds={selectedBillIds}
          onSelectedBillIdsChange={setSelectedBillIds}
        />
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
