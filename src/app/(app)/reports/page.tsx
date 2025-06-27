
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
} from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { FinalizedBillsTable } from "./components/FinalizedBillsTable";
import { ReportFilters } from "./components/ReportFilters";
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
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import * as XLSX from "xlsx";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";

const BILLS_PER_PAGE = 10;
const BILL_FETCH_LIMIT = 500; // Fetch a larger number for client-side filtering

export default function SalesReportPage() {
  const [allBills, setAllBills] = useState<FinalizedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "debt">("all");
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { user, isAdmin, loading: authLoading } = useAuth();

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const billsCollectionRef = collection(db, "finalizedBills");
      const q = query(billsCollectionRef, orderBy("date", "desc"), limit(BILL_FETCH_LIMIT));

      const querySnapshot = await getDocs(q);
      const billsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            billNumber: doc.id,
            ...data,
        } as FinalizedBill
      });
      
      setAllBills(billsList);
    } catch (error: any) {
      console.error("Error fetching finalized bills: ", error);
      toast({
          title: "Error Fetching Bills",
          description: "Could not load sales data. Please try again.",
          variant: "destructive",
      });
      setAllBills([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const filteredBills = useMemo(() => {
    setCurrentPage(1); // Reset to first page on any filter change
    setSelectedBillIds([]); // Clear selections on filter change
    
    return allBills.filter(bill => {
      const searchTermLower = searchTerm.toLowerCase();

      // Search filter
      const matchesSearch = searchTerm ? 
        bill.customerName.toLowerCase().includes(searchTermLower) || 
        bill.billNumber.toLowerCase().includes(searchTermLower) : true;

      // Status filter
      const matchesStatus = statusFilter !== 'all' ? bill.status === statusFilter : true;

      // Date filter
      const matchesDate = dateFilter ? 
        isWithinInterval(parseISO(bill.date), {
          start: startOfDay(dateFilter),
          end: endOfDay(dateFilter)
        }) : true;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [allBills, searchTerm, statusFilter, dateFilter]);

  // Client-side pagination logic
  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * BILLS_PER_PAGE;
    const endIndex = startIndex + BILLS_PER_PAGE;
    return filteredBills.slice(startIndex, endIndex);
  }, [filteredBills, currentPage]);

  const totalPages = Math.ceil(filteredBills.length / BILLS_PER_PAGE);

  const dailyTotal = useMemo(() => {
    if (!dateFilter) return null;
    return filteredBills.reduce((acc, bill) => acc + bill.amountActuallyPaid, 0);
  }, [filteredBills, dateFilter]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
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
        // Refetch data from server
        await fetchBills();
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
    if (selectedBillIds.length === 0) {
      toast({
        title: "No Bills Selected",
        description: "Please select one or more bills to export.",
      });
      return;
    }

    setIsExporting(true);
    try {
      const billsToExport = allBills.filter(bill => selectedBillIds.includes(bill.id));
      const fileNameBase = "Selected_Sales";

      const exportData: any[] = [];
      billsToExport.forEach(bill => {
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
      });
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
      
      const colWidths = Object.keys(exportData[0]).map(key => ({ wch: Math.max(key.length, ...exportData.map(row => (row[key] || "").toString().length)) + 2 }));
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

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" />
          Sales Reports
        </h1>
        <div className="flex items-center gap-2">
            {!authLoading && isAdmin && selectedBillIds.length > 0 && (
                <>
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
                <Button onClick={handleExport} disabled={isExporting || loading} variant="outline">
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    Export ({selectedBillIds.length})
                </Button>
                </>
            )}
            <Button asChild size="lg">
                <Link href="/billing">
                <PlusCircle className="mr-2 h-5 w-5" /> Go to Billing
                </Link>
            </Button>
        </div>
      </div>

      <ReportFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        clearFilters={clearFilters}
      />

      {dateFilter && dailyTotal !== null && (
        <Card className="my-4">
          <CardHeader className="p-4">
            <CardDescription>Total sales (paid amount) for {format(dateFilter, "PPP")}</CardDescription>
            <CardTitle className="text-2xl">
              ₹{dailyTotal.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">Displaying {paginatedBills.length} of {filteredBills.length} matching bills. Data is based on the last {allBills.length} transactions.</p>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <FinalizedBillsTable
          bills={paginatedBills}
          isAdmin={!authLoading && isAdmin}
          selectedBillIds={selectedBillIds}
          onSelectedBillIdsChange={setSelectedBillIds}
        />
      )}

      {!loading && paginatedBills.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-12 border rounded-lg bg-card shadow-sm">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Sales Reports Found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or clearing them to see all recent bills.</p>
        </div>
      )}

      {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between space-x-2 py-4 mt-4 border-t">
             <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || loading}
                    >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || loading}
                    >
                    Next
                </Button>
            </div>
          </div>
        )}
    </div>
  );
}
