
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

      const newGrandTotal = Math.max(0, billData.subTotal - data.discountAmount);
      let newAmountActuallyPaid = billData.amountActuallyPaid;
      let newRemainingBalance = billData.remainingBalance;

      if (data.status === 'paid') {
        newAmountActuallyPaid = newGrandTotal;
        newRemainingBalance = 0;
      } else { // status === 'debt'
        // If changing to debt, we might zero out amount paid or keep existing if it was partial.
        // For simplicity, if status changes to 'debt' from 'paid', assume it becomes fully debt.
        // If it was already 'debt' and discount changes, re-evaluate.
        // A more complex scenario would involve tracking actual payments if status is debt.
        // Let's assume if it's marked 'debt', the full newGrandTotal is the remaining balance.
        newAmountActuallyPaid = 0; 
        newRemainingBalance = newGrandTotal;
      }
      
      // If the original status was 'paid' and amountActuallyPaid was based on the old grandTotal,
      // and now discount changes (affecting grandTotal) but status remains 'paid',
      // then amountActuallyPaid should also update to the newGrandTotal.
      if (billData.status === 'paid' && data.status === 'paid') {
        newAmountActuallyPaid = newGrandTotal;
        newRemainingBalance = 0;
      }


      const updatePayload: Partial<FinalizedBill> = {
        customerName: data.customerName,
        customerAddress: data.customerAddress || "",
        discountAmount: data.discountAmount,
        remarks: data.remarks || "",
        status: data.status,
        grandTotal: newGrandTotal,
        amountActuallyPaid: newAmountActuallyPaid,
        remainingBalance: newRemainingBalance,
        // items and subTotal are not changed by this form
        // date is not changed
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
