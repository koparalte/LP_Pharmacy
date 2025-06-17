
"use client";

import type { FinalizedBill, BillItem } from "@/lib/types"; 
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, Printer, Save, CheckCircle, Trash2, Loader2, CreditCard, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

interface FinalizedBillsTableProps {
  bills: FinalizedBill[];
  onBillUpdate: (updatedBill: FinalizedBill) => void; 
  onDeleteBill: (billId: string) => Promise<void>;
}

export function FinalizedBillsTable({ bills, onBillUpdate, onDeleteBill }: FinalizedBillsTableProps) {
  const [selectedBill, setSelectedBill] = useState<FinalizedBill | null>(null);
  const [editableCustomerName, setEditableCustomerName] = useState("");
  const [editableCustomerAddress, setEditableCustomerAddress] = useState("");
  const [paymentInputValue, setPaymentInputValue] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isDeletingBill, setIsDeletingBill] = useState(false);
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);


  useEffect(() => {
    if (selectedBill) {
      setEditableCustomerName(selectedBill.customerName);
      setEditableCustomerAddress(selectedBill.customerAddress || "");
      setPaymentInputValue(""); // Reset payment input when a new bill is selected
    } else {
      setIsDeleteAlertOpen(false);
    }
  }, [selectedBill]);

  if (bills.length === 0) {
    return <p className="text-muted-foreground">No sales transactions recorded yet.</p>;
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString; 
    }
  };

  const calculateTotalItems = (bill: FinalizedBill) => {
    return bill.items.reduce((sum, item) => sum + item.quantityInBill, 0);
  };

  const handleSaveChanges = async () => {
    if (!selectedBill || !selectedBill.id) {
      toast({ title: "Error", description: "No bill selected or bill ID is missing.", variant: "destructive" });
      return;
    }

    const billDocRef = doc(db, "finalizedBills", selectedBill.id);
    const updatedDetails = {
      customerName: editableCustomerName,
      customerAddress: editableCustomerAddress,
    };

    try {
      await updateDoc(billDocRef, updatedDetails);
      const updatedBill: FinalizedBill = {
        ...selectedBill,
        ...updatedDetails,
      };
      onBillUpdate(updatedBill); 
      setSelectedBill(updatedBill); 
      toast({ title: "Success", description: "Customer details updated." });
    } catch (error) {
      console.error("Error updating bill in Firestore: ", error);
      toast({ title: "Error", description: "Could not save customer details to the database.", variant: "destructive" });
    }
  };
  
  const handlePrint = () => {
    if (selectedBill && selectedBill.id) {
      window.open(`/print-bill/${selectedBill.id}`, '_blank');
    } else {
      toast({ title: "Error", description: "No bill selected for printing.", variant: "destructive" });
    }
  };

  const getStatusBadgeVariant = (status?: 'paid' | 'debt'): "default" | "destructive" | "secondary" | "outline" | null | undefined => {
    if (status === 'paid') return 'default'; 
    if (status === 'debt') return 'destructive';
    return 'secondary'; 
  };
  
  const handlePayInFull = async () => {
    if (!selectedBill || !selectedBill.id || selectedBill.status !== 'debt') {
      toast({ title: "Action Not Allowed", description: "Bill is not marked as debt or not selected.", variant: "destructive" });
      return;
    }
    
    setIsProcessingPayment(true);
    const billDocRef = doc(db, "finalizedBills", selectedBill.id);
    const updates = {
      status: 'paid' as 'paid' | 'debt',
      amountActuallyPaid: selectedBill.grandTotal,
      remainingBalance: 0,
    };

    try {
      await updateDoc(billDocRef, updates);
      const updatedBillData: FinalizedBill = {
        ...selectedBill,
        ...updates,
      };
      onBillUpdate(updatedBillData);
      setSelectedBill(updatedBillData); // Update the selected bill in dialog
      toast({ title: "Success", description: `Bill ${selectedBill.id} marked as Paid in Full.` });
    } catch (error) {
      console.error("Error marking bill as paid in full:", error);
      toast({ title: "Error Processing Payment", description: "Could not update bill status.", variant: "destructive" });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedBill || !selectedBill.id || selectedBill.status !== 'debt') {
       toast({ title: "Action Not Allowed", description: "Cannot record payment for this bill.", variant: "destructive" });
      return;
    }

    const paymentAmount = parseFloat(paymentInputValue);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive payment amount.", variant: "destructive" });
      return;
    }
    if (paymentAmount > selectedBill.remainingBalance) {
      toast({ title: "Overpayment Alert", description: `Payment amount (₹${paymentAmount.toFixed(2)}) cannot exceed remaining balance (₹${selectedBill.remainingBalance.toFixed(2)}). Use 'Pay in Full' or adjust amount.`, variant: "destructive" });
      return;
    }
    
    setIsProcessingPayment(true);
    const billDocRef = doc(db, "finalizedBills", selectedBill.id);
    
    const newAmountActuallyPaid = selectedBill.amountActuallyPaid + paymentAmount;
    const newRemainingBalance = Math.max(0, selectedBill.grandTotal - newAmountActuallyPaid); // Ensure not negative

    let newStatus: 'paid' | 'debt' = 'debt';
    let finalAmountPaid = newAmountActuallyPaid;
    let finalRemaining = newRemainingBalance;

    if (newRemainingBalance === 0) {
      newStatus = 'paid';
      finalAmountPaid = selectedBill.grandTotal; // Ensure it's exactly grandTotal if paid off
    }
    
    const updates = {
      amountActuallyPaid: finalAmountPaid,
      remainingBalance: finalRemaining,
      status: newStatus,
    };

    try {
      await updateDoc(billDocRef, updates);
      const updatedBillData: FinalizedBill = {
        ...selectedBill,
        ...updates,
      };
      onBillUpdate(updatedBillData);
      setSelectedBill(updatedBillData); // Update the selected bill in dialog
      setPaymentInputValue(""); // Clear input
      toast({ title: "Payment Recorded", description: `₹${paymentAmount.toFixed(2)} recorded for bill ${selectedBill.id}.` });
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({ title: "Error Processing Payment", description: "Could not record payment.", variant: "destructive" });
    } finally {
      setIsProcessingPayment(false);
    }
  };


  const handleDeleteConfirm = async () => {
    if (!selectedBill || !selectedBill.id) return;
    setIsDeletingBill(true);
    try {
      await onDeleteBill(selectedBill.id);
      setIsDeleteAlertOpen(false); 
      setSelectedBill(null); 
    } catch (error) {
       // Error toast is handled by parent `onDeleteBill`
    } finally {
      setIsDeletingBill(false);
    }
  };


  return (
    <>
    <Dialog open={!!selectedBill} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setSelectedBill(null); 
        setPaymentInputValue("");
      }
    }}>
      <ScrollArea className="h-[calc(100vh-220px)] rounded-md border no-print">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-right">Grand Total (₹)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="font-mono text-xs">{bill.id}</TableCell>
                <TableCell>{formatDate(bill.date)}</TableCell>
                <TableCell>{bill.customerName}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{calculateTotalItems(bill)}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">₹{bill.grandTotal.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                   <Badge 
                    variant={getStatusBadgeVariant(bill.status)} 
                    className={
                        bill.status === 'paid' 
                        ? 'bg-green-500 text-white' 
                        : bill.status === 'debt' 
                          ? 'bg-orange-500 text-white'
                          : 'bg-muted text-muted-foreground'
                    }
                  >
                    {bill.status ? bill.status.charAt(0).toUpperCase() + bill.status.slice(1) : 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setSelectedBill(bill)}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> View
                    </Button>
                  </DialogTrigger>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {selectedBill && (
        <DialogContent className="sm:max-w-2xl no-print">
          <DialogHeader className="no-print">
            <DialogTitle>Bill Details - ID: {selectedBill.id}</DialogTitle>
            <DialogDescription>
              Date: {formatDate(selectedBill.date)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="no-print">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customerName" className="text-right col-span-1">
                  Customer Name
                </Label>
                <Input
                  id="customerName"
                  value={editableCustomerName}
                  onChange={(e) => setEditableCustomerName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customerAddress" className="text-right col-span-1">
                  Address
                </Label>
                <Input
                  id="customerAddress"
                  value={editableCustomerAddress ?? ""}
                  onChange={(e) => setEditableCustomerAddress(e.target.value)}
                  className="col-span-3"
                  placeholder="Optional"
                />
              </div>
            </div>

            <ScrollArea className="max-h-[30vh] pr-3 my-4 border rounded-md">
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Batch No.</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">MRP (₹)</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBill.items.map((item: BillItem, index: number) => ( 
                      <TableRow key={item.id && item.name ? `${item.id}-${item.name}-${index}` : `bill-item-${index}`}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.batchNo || 'N/A'}</TableCell>
                        <TableCell className="text-center">{item.quantityInBill}</TableCell>
                        <TableCell className="text-right">₹{item.mrp.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{(item.mrp * item.quantityInBill).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>

            <div className="space-y-1 text-right mt-2 text-sm">
                <p>Subtotal: INR ₹{selectedBill.subTotal?.toFixed(2) ?? '0.00'}</p>
                <p>Discount: INR ₹{selectedBill.discountAmount?.toFixed(2) ?? '0.00'}</p>
                <p className="font-semibold text-base">Grand Total: INR ₹{selectedBill.grandTotal.toFixed(2)}</p>
                <p>Amount Paid: INR ₹{(selectedBill.amountActuallyPaid || 0).toFixed(2)}</p>
                <p className={`font-medium ${selectedBill.remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    Remaining Balance: INR ₹{(selectedBill.remainingBalance || 0).toFixed(2)}
                </p>
                <p>Status: 
                    <span className={`font-semibold ml-1 ${selectedBill.status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                        {selectedBill.status ? selectedBill.status.charAt(0).toUpperCase() + selectedBill.status.slice(1) : 'Unknown'}
                    </span>
                </p>
            </div>

            {selectedBill.status === 'debt' && selectedBill.remainingBalance > 0 && (
                <div className="mt-4 pt-4 border-t">
                    <h4 className="text-md font-semibold mb-2">Record Payment</h4>
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <Input 
                            type="number"
                            placeholder="Enter payment amount"
                            value={paymentInputValue}
                            onChange={(e) => setPaymentInputValue(e.target.value)}
                            className="flex-grow"
                            min="0.01"
                            step="0.01"
                        />
                        <Button onClick={handleRecordPayment} disabled={isProcessingPayment} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" /> }
                            Record Payment
                        </Button>
                    </div>
                     <Button 
                        onClick={handlePayInFull} 
                        disabled={isProcessingPayment} 
                        className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                    >
                        {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" /> }
                        Pay in Full (₹{selectedBill.remainingBalance.toFixed(2)})
                    </Button>
                </div>
            )}
          </div>
          

          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-between items-center gap-2 no-print">
            <div className="flex gap-2 items-center flex-wrap"> 
                 <Button type="button" variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Bill
                </Button>
                
                {!authLoading && isAdmin && (
                    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                         <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                disabled={isDeletingBill}
                                onClick={() => setIsDeleteAlertOpen(true)} 
                            >
                                {isDeletingBill ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Delete Bill
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to delete this bill?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete bill ID "{selectedBill.id}".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setIsDeleteAlertOpen(false)} disabled={isDeletingBill}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteConfirm}
                                    disabled={isDeletingBill}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                {isDeletingBill ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Bill"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSaveChanges}>
                <Save className="mr-2 h-4 w-4" /> Save Customer Details
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
    </>
  );
}
