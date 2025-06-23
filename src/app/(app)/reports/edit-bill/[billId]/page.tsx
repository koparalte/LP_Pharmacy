
"use client";

import { useEffect, useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";

export default function EditBillPage() {
  const router = useRouter();
  const params = useParams();
  const { billId } = params as { billId: string };
  const { toast } = useToast();
  const { user } = useAuth();

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
            const data = billDocSnap.data();
            setBillData({ 
                id: billDocSnap.id, 
                billNumber: billDocSnap.id, // Set billNumber from doc.id
                ...data 
            } as FinalizedBill);
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

  const handleFormSubmit = async (data: EditBillFormValues, billData: FinalizedBill) => {
    setIsSubmitting(true);
    
    if (!user) {
        toast({
            title: "Authentication Required",
            description: "You must be logged in to edit bills.",
            variant: "destructive",
        });
        setIsSubmitting(false);
        return;
    }


    const discount = data.discountAmount || 0;

    if (discount > billData.subTotal) {
      toast({
        title: "Invalid Discount",
        description: `Discount (₹${discount.toFixed(2)}) cannot be greater than the Subtotal (₹${billData.subTotal.toFixed(2)}).`,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const updatePayload: { [key: string]: any } = {
      customerName: data.customerName,
      customerAddress: data.customerAddress || "",
      remarks: data.remarks || "",
      status: data.status,
      discountAmount: discount,
    };

    const newGrandTotal = billData.subTotal - discount;
    updatePayload.grandTotal = newGrandTotal;

    // Handle debt and payment logic
    if (billData.status === 'debt') {
      if (data.paidInFull) {
        updatePayload.status = 'paid';
        updatePayload.amountActuallyPaid = newGrandTotal;
        updatePayload.remainingBalance = 0;
      } else if (data.paymentReceivedNow && data.paymentReceivedNow > 0) {
        const newAmountPaid = billData.amountActuallyPaid + data.paymentReceivedNow;
        if (newAmountPaid >= newGrandTotal) {
          updatePayload.status = 'paid';
          updatePayload.amountActuallyPaid = newGrandTotal;
          updatePayload.remainingBalance = 0;
        } else {
          updatePayload.status = 'debt'; // It remains a debt
          updatePayload.amountActuallyPaid = newAmountPaid;
          updatePayload.remainingBalance = newGrandTotal - newAmountPaid;
        }
      } else {
        // No new payment, just updating status or discount for an existing debt
        updatePayload.status = data.status;
        if (data.status === 'paid') {
           updatePayload.amountActuallyPaid = newGrandTotal;
           updatePayload.remainingBalance = 0;
        } else { // status remains debt
           updatePayload.amountActuallyPaid = billData.amountActuallyPaid;
           updatePayload.remainingBalance = newGrandTotal - billData.amountActuallyPaid;
        }
      }
    } else { // Original status was 'paid'
        updatePayload.status = data.status;
        if (data.status === 'debt') {
            // If a paid bill is changed to debt, we assume 0 is paid now
            updatePayload.amountActuallyPaid = 0;
            updatePayload.remainingBalance = newGrandTotal;
        } else { // status remains 'paid'
            updatePayload.amountActuallyPaid = newGrandTotal;
            updatePayload.remainingBalance = 0;
        }
    }


    try {
      const billDocRef = doc(db, "finalizedBills", billId);
      await updateDoc(billDocRef, updatePayload);

      toast({
        title: "Bill Updated Successfully!",
        description: `Bill for ${data.customerName} has been updated.`,
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

  if (loading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Skeleton className="h-96 w-full" />
                </div>
                <div className="lg:col-span-1">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
      </div>
    );
  }

  if (!billData) {
    return <p>Bill not found or error loading data.</p>;
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold font-headline flex items-center">
                <Edit className="mr-3 h-7 w-7" />
                Edit Bill (No: {billData.billNumber})
            </h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                {billData && (
                    <EditBillForm
                        initialData={billData}
                        onFormSubmit={handleFormSubmit}
                        isLoading={isSubmitting}
                        disabled={!user}
                    />
                )}
            </div>

            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Bill Items</CardTitle>
                        <CardDescription>Items in this bill (read-only).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {billData.items.map((item, index) => (
                                        <TableRow key={`${item.id}-${index}`}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-right">{item.quantityInBill}</TableCell>
                                            <TableCell className="text-right">₹{(item.mrp * item.quantityInBill).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                        <div className="mt-4 pt-4 border-t text-right space-y-1 text-sm">
                            <p>Subtotal: <span className="font-semibold">₹{billData.subTotal.toFixed(2)}</span></p>
                            <p>Discount: <span className="font-semibold">₹{billData.discountAmount.toFixed(2)}</span></p>
                            <p className="text-base">Grand Total: <span className="font-bold">₹{billData.grandTotal.toFixed(2)}</span></p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
