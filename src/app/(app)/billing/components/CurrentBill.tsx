"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingCart, Plus, Minus } from "lucide-react";
import type { BillInProgressItem } from "@/lib/types";

interface CurrentBillProps {
  items: BillInProgressItem[];
  onQuantityChange: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  subTotal: number;
}

export function CurrentBill({ items, onQuantityChange, onRemoveItem, subTotal }: CurrentBillProps) {

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Current Bill</CardTitle>
        <CardDescription>Items added to the current transaction.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        {items.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground p-4">
            <ShoppingCart className="h-12 w-12 mb-4" />
            <p>Your bill is empty.</p>
            <p className="text-sm">Use the search on the left to add items.</p>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[120px]">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => onQuantityChange(item.id, item.quantityInBill - 1)}
                          disabled={item.quantityInBill <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-bold text-center w-8">{item.quantityInBill}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => onQuantityChange(item.id, item.quantityInBill + 1)}
                          disabled={item.quantityInBill >= item.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                       <p className="text-xs text-muted-foreground mt-1">
                        Stock: {item.stock}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">₹{(item.mrp * item.quantityInBill).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-auto pt-4 border-t">
            <div className="text-right text-xl font-bold">
              Subtotal: ₹{subTotal.toFixed(2)}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
