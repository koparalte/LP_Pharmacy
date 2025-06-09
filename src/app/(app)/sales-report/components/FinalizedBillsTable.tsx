
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
import { Eye } from "lucide-react";
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
import { useState } from "react";

interface FinalizedBillsTableProps {
  bills: FinalizedBill[];
}

export function FinalizedBillsTable({ bills }: FinalizedBillsTableProps) {
  const [selectedBill, setSelectedBill] = useState<FinalizedBill | null>(null);

  if (bills.length === 0) {
    return <p className="text-muted-foreground">No sales transactions recorded yet.</p>;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateTotalItems = (bill: FinalizedBill) => {
    return bill.items.reduce((sum, item) => sum + item.quantityInBill, 0);
  };

  return (
    <Dialog open={!!selectedBill} onOpenChange={(isOpen) => !isOpen && setSelectedBill(null)}>
      <ScrollArea className="h-[calc(100vh-220px)] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill ID</TableHead>
              <TableHead>Date</TableHead>
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

      {/* DialogContent is still conditionally rendered based on selectedBill to ensure data is ready */}
      {selectedBill && (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bill Details - ID: {selectedBill.id}</DialogTitle>
            <DialogDescription>
              Date: {formatDate(selectedBill.date)}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] pr-3 my-4">
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
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

    