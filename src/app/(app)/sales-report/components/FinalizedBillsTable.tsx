
"use client";

import type { FinalizedBill, BillItem } from "@/lib/types"; // BillItem needs to be imported if not already
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
      onBillUpdate(storedBills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setSelectedBill(updatedBill); 
      toast({ title: "Success", description: "Customer details updated." });
    } else {
      toast({ title: "Error", description: "Bill not found for update.", variant: "destructive" });
    }
  };
  
  const handlePrint = () => {
    window.print();
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
        <DialogContent className="sm:max-w-2xl print-dialog-content">
          <DialogHeader>
            <DialogTitle>Bill Details - ID: {selectedBill.id}</DialogTitle>
            <DialogDescription>
              Date: {formatDate(selectedBill.date)}
            </DialogDescription>
          </DialogHeader>
          
          <div id="printable-bill-content">
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
               <div className="print-only hidden text-sm">
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
              <div className="print-only hidden text-sm">
                <p><strong>Address:</strong> {editableCustomerAddress || 'N/A'}</p>
              </div>
            </div>

            <ScrollArea className="max-h-[40vh] pr-3 my-4 border rounded-md print-dialog-scroll-area print-items-table-area">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Rate (₹)</TableHead> {/* Was Unit Price */}
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBill.items.map((item: BillItem) => ( // Explicitly type item as BillItem
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantityInBill}</TableCell>
                      <TableCell className="text-right">INR ₹{item.rate.toFixed(2)}</TableCell> {/* Use item.rate */}
                      <TableCell className="text-right">INR ₹{(item.rate * item.quantityInBill).toFixed(2)}</TableCell> {/* Use item.rate */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="flex justify-end items-center font-semibold text-lg border-t pt-4 print-grand-total">
              <span>Grand Total:</span>
              <span className="ml-2">INR ₹{selectedBill.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-between items-center gap-2 no-print">
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
