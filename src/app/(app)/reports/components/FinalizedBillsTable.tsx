
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { FinalizedBill, BillItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Printer, Eye, Edit } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FinalizedBillsTableProps {
  bills: FinalizedBill[];
}

export function FinalizedBillsTable({ bills }: FinalizedBillsTableProps) {
  const [selectedBillForDialog, setSelectedBillForDialog] = useState<FinalizedBill | null>(null);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy, hh:mm a");
    } catch {
      return "Invalid Date";
    }
  };
  
  const calculateItemTotal = (item: BillItem) => {
    return item.mrp * item.quantityInBill;
  };

  return (
    <Dialog open={!!selectedBillForDialog} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setSelectedBillForDialog(null);
      }
    }}>
      <div className="border rounded-lg shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Discount (₹)</TableHead>
              <TableHead className="text-right">Grand Total (₹)</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="font-medium">{bill.id}</TableCell>
                <TableCell className="text-xs">{formatDate(bill.date)}</TableCell>
                <TableCell>{bill.customerName}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={bill.status === "paid" ? "default" : "destructive"} 
                         className={bill.status === "paid" ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"}>
                    {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{bill.items.reduce((sum, item) => sum + item.quantityInBill, 0)}</TableCell>
                <TableCell className="text-right">₹{bill.discountAmount.toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold">₹{bill.grandTotal.toFixed(2)}</TableCell>
                <TableCell className="text-xs">{bill.remarks || "N/A"}</TableCell>
                <TableCell className="text-right">
                  <DialogTrigger asChild>
                     <Button variant="outline" size="sm" onClick={() => setSelectedBillForDialog(bill)}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> View
                    </Button>
                  </DialogTrigger>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedBillForDialog && (
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Bill Details - {selectedBillForDialog.id}</DialogTitle>
                  <DialogDescription>
                      Customer: {selectedBillForDialog.customerName} | Date: {formatDate(selectedBillForDialog.date)} | Status: <Badge variant={selectedBillForDialog.status === "paid" ? "default" : "destructive"} className={selectedBillForDialog.status === "paid" ? "bg-green-600 hover:bg-green-700 text-xs" : "bg-orange-500 hover:bg-orange-600 text-xs"}>{selectedBillForDialog.status.charAt(0).toUpperCase() + selectedBillForDialog.status.slice(1)}</Badge>
                  </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[50vh] pr-4">
                <div className="text-sm mb-3">
                  <p><strong>Address:</strong> {selectedBillForDialog.customerAddress || 'N/A'}</p>
                  {selectedBillForDialog.remarks && <p><strong>Remarks:</strong> {selectedBillForDialog.remarks}</p>}
                </div>

                <Table className="mb-4">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Item Name</TableHead>
                            <TableHead>Batch No.</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">MRP (₹)</TableHead>
                            <TableHead className="text-right">Total (₹)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectedBillForDialog.items.map((item, idx) => (
                            <TableRow key={`${item.id}-${idx}`}>
                                <TableCell className="font-medium text-xs py-1.5">{item.name}</TableCell>
                                <TableCell className="text-xs py-1.5">{item.batchNo || 'N/A'}</TableCell>
                                <TableCell className="text-center text-xs py-1.5">{item.quantityInBill}</TableCell>
                                <TableCell className="text-right text-xs py-1.5">₹{item.mrp.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-xs py-1.5">₹{calculateItemTotal(item).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </ScrollArea>
              
               <div className="mt-2 text-right space-y-1 text-sm border-t pt-3">
                  <p>Subtotal: <span className="font-medium">₹{selectedBillForDialog.subTotal.toFixed(2)}</span></p>
                  <p>Discount: <span className="font-medium">₹{selectedBillForDialog.discountAmount.toFixed(2)}</span></p>
                  <p className="text-base font-semibold">Grand Total: <span className="font-bold">₹{selectedBillForDialog.grandTotal.toFixed(2)}</span></p>
               </div>

              <DialogFooter className="mt-4 gap-2 sm:justify-end">
                  <Button variant="outline" asChild>
                      <Link href={`/reports/edit-bill/${selectedBillForDialog.id}`} onClick={() => setSelectedBillForDialog(null)}>
                         <Edit className="mr-2 h-4 w-4" /> Edit Bill
                      </Link>
                  </Button>
                  <Button asChild>
                      <Link href={`/print-bill/${selectedBillForDialog.id}`} target="_blank" rel="noopener noreferrer" onClick={() => setSelectedBillForDialog(null)}>
                         <Printer className="mr-2 h-4 w-4" /> Print Bill
                      </Link>
                  </Button>
                  <DialogClose asChild>
                      <Button variant="ghost">Close</Button>
                  </DialogClose>
              </DialogFooter>
          </DialogContent>
      )}
    </Dialog>
  );
}
