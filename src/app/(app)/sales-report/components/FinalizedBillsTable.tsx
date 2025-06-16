
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
import { Eye, Printer, Save, CheckCircle, Trash2, Loader2 } from "lucide-react";
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
  AlertDialogTrigger, // Added AlertDialogTrigger back
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeletingBill, setIsDeletingBill] = useState(false);
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false); // Used to control AlertDialog specifically for delete


  useEffect(() => {
    if (selectedBill) {
      setEditableCustomerName(selectedBill.customerName);
      setEditableCustomerAddress(selectedBill.customerAddress || "");
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
    window.print();
  };

  const getStatusBadgeVariant = (status?: 'paid' | 'debt'): "default" | "destructive" | "secondary" | "outline" | null | undefined => {
    if (status === 'paid') return 'default'; 
    if (status === 'debt') return 'destructive';
    return 'secondary'; 
  };

  const handleClearDebt = async () => {
    if (!selectedBill || !selectedBill.id || selectedBill.status !== 'debt') {
      toast({ title: "Error", description: "Bill is not marked as debt or not selected.", variant: "destructive" });
      return;
    }
    
    setIsUpdatingStatus(true);
    const billDocRef = doc(db, "finalizedBills", selectedBill.id);
    try {
      await updateDoc(billDocRef, { status: 'paid' });
      const updatedBill: FinalizedBill = {
        ...selectedBill,
        status: 'paid',
      };
      onBillUpdate(updatedBill);
      setSelectedBill(updatedBill);
      toast({ title: "Success", description: `Bill ${selectedBill.id} marked as Paid.` });
    } catch (error) {
      console.error("Error clearing debt:", error);
      toast({ title: "Error Clearing Debt", description: "Could not update bill status.", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBill || !selectedBill.id) return;
    setIsDeletingBill(true);
    try {
      await onDeleteBill(selectedBill.id);
      setIsDeleteAlertOpen(false); // Close alert dialog
      setSelectedBill(null); // Close main bill dialog
    } catch (error) {
       // Error toast is handled by parent `onDeleteBill`
    } finally {
      setIsDeletingBill(false);
    }
  };


  return (
    <>
    <Dialog open={!!selectedBill && !isDeleteAlertOpen} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setSelectedBill(null);
        // Ensure delete alert is also closed if main dialog is closed
        setIsDeleteAlertOpen(false); 
      }
    }}>
      <ScrollArea className="h-[calc(100vh-220px)] rounded-md border">
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
        <DialogContent className="sm:max-w-2xl print-dialog-content">
          <DialogHeader className="no-print">
            <DialogTitle>Bill Details - ID: {selectedBill.id}</DialogTitle>
            <DialogDescription>
              Date: {formatDate(selectedBill.date)}
            </DialogDescription>
          </DialogHeader>
          
          <div id="printable-bill-content">
            <div className="print-only text-center mb-4">
                <h2 className="text-lg font-bold">LP PHARMACY</h2>
                <p className="text-sm">Venglai, Lunglei</p>
                <p className="text-sm">Phone : 8118969532</p>
            </div>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4 no-print">
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
               <div className="print-only text-sm">
                <p><strong>Bill ID:</strong> {selectedBill.id}</p>
                <p><strong>Date:</strong> {formatDate(selectedBill.date)}</p>
                <p><strong>Customer Name:</strong> {editableCustomerName}</p>
              </div>

              <div className="grid grid-cols-4 items-center gap-4 no-print">
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
              <div className="print-only text-sm">
                <p><strong>Address:</strong> {editableCustomerAddress || 'N/A'}</p>
              </div>
               <div className="text-sm">
                <p><strong>Status:</strong> 
                    <span className={
                        selectedBill.status === 'paid' 
                        ? 'text-green-600 font-semibold' 
                        : selectedBill.status === 'debt' 
                            ? 'text-orange-600 font-semibold' 
                            : 'text-muted-foreground font-semibold'
                        }>
                        {selectedBill.status ? selectedBill.status.charAt(0).toUpperCase() + selectedBill.status.slice(1) : 'Unknown'}
                    </span>
                </p>
              </div>
            </div>

            <ScrollArea className="max-h-[40vh] pr-3 my-4 border rounded-md print-dialog-scroll-area print-items-table-area">
              <div className="relative w-full overflow-auto print-table-wrapper">
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
            
            <div className="space-y-1 text-right mt-2 print-grand-total">
                <p className="text-sm">Subtotal: INR ₹{selectedBill.subTotal?.toFixed(2) ?? '0.00'}</p>
                <p className="text-sm">Discount: INR ₹{selectedBill.discountAmount?.toFixed(2) ?? '0.00'}</p>
                <p className="font-semibold text-lg">Grand Total: INR ₹{selectedBill.grandTotal.toFixed(2)}</p>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-between items-center gap-2 no-print">
            <div className="flex gap-2 items-center"> 
                 <Button type="button" variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Bill
                </Button>
                {selectedBill.status === 'debt' && (
                  <Button
                    type="button"
                    onClick={handleClearDebt}
                    disabled={isUpdatingStatus}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {isUpdatingStatus ? "Updating..." : "Mark as Paid"}
                  </Button>
                )}
                {!authLoading && isAdmin && (
                    <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                disabled={isDeletingBill}
                                onClick={() => setIsDeleteAlertOpen(true)} // Open delete alert
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
                <Save className="mr-2 h-4 w-4" /> Save Details
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
    </>
  );
}
    

    
