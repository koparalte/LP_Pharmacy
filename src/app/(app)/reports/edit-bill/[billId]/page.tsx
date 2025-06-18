
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FinalizedBill, BillItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import { EditBillForm, type EditBillFormValues } from "../../components/EditBillForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";

export default function EditBillPage() {
  const router = useRouter();
  const params = useParams();
  const { billId } = params as { billId: string };
  const { toast } = useToast();

  const [billData, setBillData] = useState<FinalizedBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (billId) {
      const fetchBill = async () => {
        setLoading(true);
        try {
          const billDocRef = doc(db, "finalizedBills", billId);
          const billDocSnap = await getDoc(billDocRef);

          if (billDocSnap.exists()) {
            setBillData({ id: billDocSnap.id, ...billDocSnap.data() } as FinalizedBill);
          } else {
            toast({
              title: "Error",
              description: "Bill not found.",
              variant: "destructive",
            });
            router.push("/reports");
          }
        } catch (error) {
          console.error("Error fetching bill: ", error);
          toast({
            title: "Error Fetching Bill",
            description: "Could not load bill data. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };
      fetchBill();
    }
  }, [billId, toast, router]);

  const handleFormSubmit = async (data: EditBillFormValues) => {
    setIsSubmitting(true);
    if (!billData) {
      toast({ title: "Error", description: "Original bill data missing.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      const billDocRef = doc(db, "finalizedBills", billId);
      
      const newGrandTotal = billData.subTotal - (data.discountAmount || 0);

      let updatedStatus = data.status;
      let updatedAmountPaid = billData.amountActuallyPaid;
      let updatedRemainingBalance = billData.remainingBalance;

      // Handle debt payment logic first if original status was debt
      if (billData.status === 'debt') {
        if (data.paidInFull) {
          updatedStatus = 'paid';
          updatedAmountPaid = newGrandTotal;
          updatedRemainingBalance = 0;
        } else if (data.paymentReceivedNow && data.paymentReceivedNow > 0) {
          updatedAmountPaid += data.paymentReceivedNow;
          if (updatedAmountPaid >= newGrandTotal) {
            updatedStatus = 'paid';
            updatedAmountPaid = newGrandTotal; // Cap at grand total
            updatedRemainingBalance = 0;
          } else {
            // Bill remains debt if status dropdown hasn't changed it to paid
            updatedStatus = data.status === 'paid' ? 'paid' : 'debt'; 
            if(updatedStatus === 'paid'){
                 updatedAmountPaid = newGrandTotal;
                 updatedRemainingBalance = 0;
            } else {
                 updatedRemainingBalance = newGrandTotal - updatedAmountPaid;
            }
          }
        }
      }
      
      // General status change and grand total adjustment logic
      // This section will apply if not handled by specific debt payment actions above,
      // or if original status was 'paid'.
      if (!data.paidInFull && !(billData.status === 'debt' && data.paymentReceivedNow && data.paymentReceivedNow > 0) ) {
         if (data.status === 'paid') {
            updatedStatus = 'paid';
            updatedAmountPaid = newGrandTotal;
            updatedRemainingBalance = 0;
        } else { // data.status === 'debt'
            updatedStatus = 'debt';
            if (billData.status === 'paid') { // If changed from 'paid' to 'debt'
                 updatedAmountPaid = 0; // Reset paid amount for new debt
            }
            // If it was already 'debt', updatedAmountPaid carries over unless modified by paymentReceivedNow
            updatedRemainingBalance = newGrandTotal - updatedAmountPaid;
        }
      }


      // Final consistency checks and adjustments
      if (updatedStatus === 'paid') {
        updatedAmountPaid = newGrandTotal;
        updatedRemainingBalance = 0;
      } else { // status is 'debt'
        if (updatedAmountPaid > newGrandTotal) { // Cannot have paid more than the new total if it's still debt
          updatedAmountPaid = newGrandTotal; // This would imply it should be paid
          updatedStatus = 'paid';
          updatedRemainingBalance = 0;
        } else {
             updatedRemainingBalance = newGrandTotal - updatedAmountPaid;
        }
      }
      
      if (updatedRemainingBalance < 0) updatedRemainingBalance = 0; // Remaining balance cannot be negative
      if (updatedAmountPaid < 0) updatedAmountPaid = 0; // Amount paid cannot be negative
      if (newGrandTotal < 0) { // Should not happen with discount validation, but as a safeguard
          // This implies an error in subTotal or discount, log or handle
          toast({title: "Calculation Error", description: "Grand total became negative.", variant: "destructive"});
          setIsSubmitting(false);
          return;
      }


      const updatePayload: Partial<FinalizedBill> = {
        customerName: data.customerName,
        customerAddress: data.customerAddress || "",
        discountAmount: data.discountAmount || 0,
        remarks: data.remarks || "",
        status: updatedStatus,
        grandTotal: newGrandTotal,
        amountActuallyPaid: updatedAmountPaid,
        remainingBalance: updatedRemainingBalance,
      };

      await updateDoc(billDocRef, updatePayload);
      
      toast({
        title: "Bill Updated Successfully!",
        description: `Bill ${billId} has been updated.`,
      });
      router.push("/reports"); 
    } catch (error) {
      console.error("Error updating bill: ", error);
      toast({
        title: "Error Updating Bill",
        description: "There was an issue saving the changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const calculateItemTotal = (item: BillItem) => item.mrp * item.quantityInBill;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "MMM d, yyyy, hh:mm a");
    } catch {
      return "Invalid Date";
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent>
                <Skeleton className="h-64 w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!billData) {
    return <p className="text-center text-lg text-muted-foreground py-10">Bill data not found or error loading data.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
         <Button variant="outline" size="icon" onClick={() => router.back()} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
         </Button>
        <h1 className="text-3xl font-bold font-headline flex items-center">
            <Edit className="mr-3 h-7 w-7" /> Edit Bill: {billId}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                <CardTitle>Bill Information</CardTitle>
                <CardDescription>
                    Date: {formatDate(billData.date)} | Original Subtotal: ₹{billData.subTotal.toFixed(2)}
                </CardDescription>
                </CardHeader>
                <CardContent>
                <EditBillForm
                    initialData={billData}
                    onFormSubmit={handleFormSubmit}
                    isLoading={isSubmitting}
                    subTotal={billData.subTotal}
                />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Items in Bill</CardTitle>
                    <CardDescription>These items cannot be edited here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(100vh-350px)] pr-3 min-h-[200px]">
                        {billData.items.length > 0 ? (
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">Total (₹)</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {billData.items.map((item, idx) => (
                                <TableRow key={`${item.id}-${idx}`}>
                                <TableCell className="font-medium text-sm py-1.5">{item.name}</TableCell>
                                <TableCell className="text-center text-sm py-1.5">{item.quantityInBill}</TableCell>
                                <TableCell className="text-right text-sm py-1.5">₹{calculateItemTotal(item).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        ) : (
                            <p className="text-muted-foreground text-sm">No items in this bill.</p>
                        )}
                    </ScrollArea>
                    <div className="mt-4 border-t pt-3 space-y-1 text-sm">
                        <p className="flex justify-between">Subtotal: <span>₹{billData.subTotal.toFixed(2)}</span></p>
                        <p className="flex justify-between">Current Discount: <span>₹{billData.discountAmount.toFixed(2)}</span></p>
                        <p className="flex justify-between font-semibold text-base">Current Grand Total: <span>₹{billData.grandTotal.toFixed(2)}</span></p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

