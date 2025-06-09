
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CashoutTransaction } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PackageSearch } from "lucide-react";

interface CashoutHistoryTableProps {
  transactions: CashoutTransaction[];
}

export function CashoutHistoryTable({ transactions }: CashoutHistoryTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 border rounded-lg bg-card shadow-sm mt-6">
        <PackageSearch className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold">No Cashout Transactions Yet</h3>
        <p className="text-sm text-muted-foreground">Your cashout history will appear here.</p>
      </div>
    );
  }
  
  const getStatusVariant = (status: CashoutTransaction['status']) => {
    switch (status) {
      case 'Completed': return 'default'; // default is often green-ish or primary
      case 'Pending': return 'secondary';
      case 'Processing': return 'outline'; // or a specific color if available
      case 'Failed': return 'destructive';
      default: return 'secondary';
    }
  };


  return (
    <ScrollArea className="h-[400px] mt-6 border rounded-lg shadow-sm bg-card">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount (₹)</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
              <TableCell className="text-right font-medium">₹{transaction.amount.toFixed(2)}</TableCell>
              <TableCell>{transaction.method}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(transaction.status)}>{transaction.status}</Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate">{transaction.notes || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
