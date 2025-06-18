
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
import type { FinalizedBill } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Printer, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
// Future: Dialog for viewing items
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogDescription
// } from "@/components/ui/dialog";
// import { useState } from "react";

interface FinalizedBillsTableProps {
  bills: FinalizedBill[];
}

export function FinalizedBillsTable({ bills }: FinalizedBillsTableProps) {
  // const [selectedBillForDialog, setSelectedBillForDialog] = useState<FinalizedBill | null>(null);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy, hh:mm a");
    } catch {
      return "Invalid Date";
    }
  };

  return (
    <>
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
                {/* Future: View Items Dialog Trigger
                <DialogTrigger asChild>
                   <Button variant="ghost" size="icon" className="mr-2 hover:text-primary" onClick={() => setSelectedBillForDialog(bill)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                */}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/print-bill/${bill.id}`} target="_blank" rel="noopener noreferrer">
                    <Printer className="mr-1 h-3.5 w-3.5" /> Print
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {/* Future: View Items Dialog Content
      {selectedBillForDialog && (
        <Dialog open={!!selectedBillForDialog} onOpenChange={(isOpen) => !isOpen && setSelectedBillForDialog(null)}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Bill Details - {selectedBillForDialog.id}</DialogTitle>
                    <DialogDescription>
                        Customer: {selectedBillForDialog.customerName} | Date: {formatDate(selectedBillForDialog.date)}
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Batch No.</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">MRP (₹)</TableHead>
                                <TableHead className="text-right">Total (₹)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedBillForDialog.items.map((item, idx) => (
                                <TableRow key={`${item.id}-${idx}`}>
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
                 <div className="mt-4 text-right space-y-1 text-sm">
                    <p>Subtotal: <span className="font-medium">₹{selectedBillForDialog.subTotal.toFixed(2)}</span></p>
                    <p>Discount: <span className="font-medium">₹{selectedBillForDialog.discountAmount.toFixed(2)}</span></p>
                    <p className="text-base font-semibold">Grand Total: <span className="font-bold">₹{selectedBillForDialog.grandTotal.toFixed(2)}</span></p>
                </div>
            </DialogContent>
        </Dialog>
      )}
    */}
    </>
  );
}
