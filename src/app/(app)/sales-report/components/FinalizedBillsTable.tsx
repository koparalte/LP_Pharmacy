
"use client";

import type { FinalizedBill } from "@/lib/types";
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
import { Eye, Printer, Save } from "lucide-react";
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
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const FINALIZED_BILLS_STORAGE_KEY = 'lpPharmacyFinalizedBills';

interface FinalizedBillsTableProps {
  bills: FinalizedBill[];
  onBillUpdate: (updatedBills: FinalizedBill[]) => void;
}

export function FinalizedBillsTable({ bills, onBillUpdate }: FinalizedBillsTableProps) {
  const [selectedBill, setSelectedBill] = useState<FinalizedBill | null>(null);
  const [editableCustomerName, setEditableCustomerName] = useState("");
  const [editableCustomerAddress, setEditableCustomerAddress] = useState("");
  const { toast } = useToast();

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
    return new Date(dateString).toLocaleString();
  };

  const calculateTotalItems = (bill: FinalizedBill) => {
    return bill.items.reduce((sum, item) => sum + item.quantityInBill, 0);
  };

  const handleSaveChanges = () => {
    if (!selectedBill) return;

    const updatedBill: FinalizedBill = {
      ...selectedBill,
      customerName: editableCustomerName,
      customerAddress: editableCustomerAddress,
    };

    const storedBillsRaw = localStorage.getItem(FINALIZED_BILLS_STORAGE_KEY);
    let storedBills: FinalizedBill[] = [];
    if (storedBillsRaw) {
      try {
        storedBills = JSON.parse(storedBillsRaw);
      } catch (e) {
        console.error("Failed to parse bills from localStorage for update", e);
        toast({ title: "Error", description: "Could not load bills to save changes.", variant: "destructive" });
        return;
      }
    }

    const billIndex = storedBills.findIndex(b => b.id === selectedBill.id);
    if (billIndex > -1) {
      storedBills[billIndex] = updatedBill;
      localStorage.setItem(FINALIZED_BILLS_STORAGE_KEY, JSON.stringify(storedBills));
      onBillUpdate(storedBills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); // Pass sorted updated list
      setSelectedBill(updatedBill); // Update the selected bill in dialog state
      toast({ title: "Success", description: "Customer details updated." });
    } else {
      toast({ title: "Error", description: "Bill not found for update.", variant: "destructive" });
    }
  };
  
  const handlePrint = () => {
    // For a more controlled print, you might hide elements not part of the bill.
    // This is a basic implementation.
    const printContents = document.getElementById("printable-bill-content")?.innerHTML;
    const originalContents = document.body.innerHTML;

    if (printContents) {
      // Temporarily replace body content, print, then restore
      // This is a very basic approach and might have side effects or styling issues
      // A better way is a dedicated printable component or CSS print styles.
      // document.body.innerHTML = printContents;
      window.print();
      // document.body.innerHTML = originalContents; 
      // window.location.reload(); // Reload to restore event listeners etc. if body.innerHTML was replaced
    } else {
       window.print(); // Fallback to printing the whole dialog if specific content not found
    }
  };


  return (
    <Dialog open={!!selectedBill} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setSelectedBill(null);
      }
    }}>
      <ScrollArea className="h-[calc(100vh-220px)] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-center">Items Sold</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
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
                <TableCell className="text-right font-medium">INR ₹{bill.grandTotal.toFixed(2)}</TableCell>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bill Details - ID: {selectedBill.id}</DialogTitle>
            <DialogDescription>
              Date: {formatDate(selectedBill.date)}
            </DialogDescription>
          </DialogHeader>
          
          <div id="printable-bill-content"> {/* Wrapper for printing */}
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
                  value={editableCustomerAddress}
                  onChange={(e) => setEditableCustomerAddress(e.target.value)}
                  className="col-span-3"
                  placeholder="Optional"
                />
              </div>
            </div>

            <ScrollArea className="max-h-[40vh] pr-3 my-4 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBill.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantityInBill}</TableCell>
                      <TableCell className="text-right">INR ₹{item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">INR ₹{(item.unitPrice * item.quantityInBill).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="flex justify-end items-center font-semibold text-lg border-t pt-4">
              <span>Grand Total:</span>
              <span className="ml-2">INR ₹{selectedBill.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
            <Button type="button" variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print Bill
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleSaveChanges}>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
