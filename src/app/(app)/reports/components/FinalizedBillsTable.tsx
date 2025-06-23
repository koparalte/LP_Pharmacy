
"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Printer, Edit, FileText } from "lucide-react";
import type { FinalizedBill, BillItem } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

interface FinalizedBillsTableProps {
  bills: FinalizedBill[];
  isAdmin: boolean;
  isGuest: boolean;
  selectedBillIds: string[];
  onSelectedBillIdsChange: (ids: string[]) => void;
}

export function FinalizedBillsTable({ bills, isAdmin, isGuest, selectedBillIds, onSelectedBillIdsChange }: FinalizedBillsTableProps) {
  const [selectedBill, setSelectedBill] = useState<FinalizedBill | null>(null);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd MMM yyyy, p"); // e.g., 20 Jun 2024, 4:30 PM
    } catch {
      return "Invalid Date";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "p"); // e.g. 4:30 PM
    } catch {
      return "Invalid Time";
    }
  };

  const groupedBills = bills.reduce((acc, bill) => {
    const dateKey = format(parseISO(bill.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = {
        bills: [],
        total: 0,
      };
    }
    acc[dateKey].bills.push(bill);
    acc[dateKey].total += bill.grandTotal;
    return acc;
  }, {} as Record<string, { bills: FinalizedBill[], total: number }>);


  const BillDetailsDialog = ({ bill }: { bill: FinalizedBill }) => (
     <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Bill Details - Bill No: {bill.billNumber}</DialogTitle>
        <DialogDescription>
          A detailed summary of the bill for {bill.customerName}.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-sm">
        <div>
          <h3 className="font-semibold mb-2">Customer Information</h3>
          <p><span className="text-muted-foreground">Name:</span> {bill.customerName}</p>
          <p><span className="text-muted-foreground">Address:</span> {bill.customerAddress || 'N/A'}</p>
          <p><span className="text-muted-foreground">Remarks:</span> {bill.remarks || 'N/A'}</p>
        </div>
        <div className="text-right">
           <h3 className="font-semibold mb-2">Financial Summary</h3>
           <p><span className="text-muted-foreground">Date:</span> {formatDate(bill.date)}</p>
           <p><span className="text-muted-foreground">Status:</span> <Badge variant={bill.status === 'paid' ? 'secondary' : 'destructive'} className="ml-1">{bill.status.toUpperCase()}</Badge></p>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Items Purchased</h3>
        <ScrollArea className="h-[200px] border rounded-md">
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-right">MRP (₹)</TableHead>
                <TableHead className="text-right">Total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.items.map((item, index) => (
                <TableRow key={`${item.id}-${index}`}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.quantityInBill}</TableCell>
                  <TableCell className="text-right">₹{item.mrp.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{(item.mrp * item.quantityInBill).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
       <div className="mt-4 pt-4 border-t grid grid-cols-2 text-sm">
            <div>
                 <Button asChild variant="outline">
                    <Link href={`/print-bill/${bill.id}`} target="_blank">
                        <Printer className="mr-2 h-4 w-4"/>
                        Print Bill
                    </Link>
                </Button>
            </div>
            <div className="space-y-1 text-right">
                <p>Subtotal: <span className="font-semibold">₹{bill.subTotal.toFixed(2)}</span></p>
                <p>Discount: <span className="font-semibold text-destructive">- ₹{bill.discountAmount.toFixed(2)}</span></p>
                <p className="text-base font-bold">Grand Total: <span className="font-bold">₹{bill.grandTotal.toFixed(2)}</span></p>
                <p>Amount Paid: <span className="font-semibold text-green-600">₹{bill.amountActuallyPaid.toFixed(2)}</span></p>
                <p>Balance Due: <span className="font-bold text-destructive">₹{bill.remainingBalance.toFixed(2)}</span></p>
            </div>
        </div>
    </DialogContent>
  );

  if (bills.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center text-center py-12 border rounded-lg bg-card shadow-sm">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Sales Reports Found</h3>
        <p className="text-muted-foreground">Finalized bills will appear here once sales are made.</p>
      </div>
    );
  }

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedBill(null)}>
        <div className="border rounded-lg shadow-sm overflow-hidden bg-card">
        <Table>
            <TableHeader>
            <TableRow>
                {isAdmin && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={bills.length > 0 && selectedBillIds.length === bills.length}
                      onCheckedChange={(checked) => {
                        onSelectedBillIdsChange(checked ? bills.map((b) => b.id) : []);
                      }}
                      aria-label="Select all bills on page"
                    />
                  </TableHead>
                )}
                <TableHead>Bill No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Grand Total (₹)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {Object.entries(groupedBills).map(([date, { bills: billsForDate, total }]) => (
                <Fragment key={date}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 pointer-events-none">
                        <TableCell colSpan={isAdmin ? 8 : 7} className="font-bold">
                            <div className="flex justify-between items-center text-base">
                                <span>{format(parseISO(date), "PPP")}</span>
                                <span className="text-primary">Daily Total: ₹{total.toFixed(2)}</span>
                            </div>
                        </TableCell>
                    </TableRow>
                    {billsForDate.map((bill) => (
                        <TableRow key={bill.id} data-state={selectedBillIds.includes(bill.id) && "selected"}>
                        {isAdmin && (
                            <TableCell>
                            <Checkbox
                                checked={selectedBillIds.includes(bill.id)}
                                onCheckedChange={(checked) => {
                                const newSelectedIds = checked
                                    ? [...selectedBillIds, bill.id]
                                    : selectedBillIds.filter((id) => id !== bill.id);
                                onSelectedBillIdsChange(newSelectedIds);
                                }}
                                aria-label={`Select bill ${bill.billNumber}`}
                            />
                            </TableCell>
                        )}
                        <TableCell className="font-mono text-xs">{bill.billNumber}</TableCell>
                        <TableCell className="font-medium">{bill.customerName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatTime(bill.date)}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={bill.status === 'paid' ? 'secondary' : 'destructive'}>
                            {bill.status}
                            </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${bill.status === 'debt' ? 'text-destructive' : ''}`}>
                            {bill.status === 'debt' ? `₹${bill.remainingBalance.toFixed(2)}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">₹{bill.grandTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="mr-2 hover:text-primary" onClick={() => setSelectedBill(bill)}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            {!isGuest ? (
                                <Button asChild variant="ghost" size="icon" className="mr-2 hover:text-primary">
                                    <Link href={`/reports/edit-bill/${bill.id}`}>
                                        <Edit className="h-4 w-4" />
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" className="mr-2" disabled>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                             <Button asChild variant="ghost" size="icon" className="hover:text-primary">
                                <Link href={`/print-bill/${bill.id}`} target="_blank">
                                    <Printer className="h-4 w-4" />
                                </Link>
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                </Fragment>
            ))}
            </TableBody>
        </Table>
        </div>
        {selectedBill && <BillDetailsDialog bill={selectedBill} />}
    </Dialog>
  );
}
