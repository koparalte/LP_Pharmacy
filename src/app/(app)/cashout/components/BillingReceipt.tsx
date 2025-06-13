
"use client";

import type { BillItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";

interface BillingReceiptProps {
  billItems: BillItem[];
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onFinalizeBill: () => void;
  isSubmitting: boolean;
}

export function BillingReceipt({ billItems, onRemoveItem, onUpdateQuantity, onFinalizeBill, isSubmitting }: BillingReceiptProps) {
  const calculateSubtotal = (item: BillItem) => item.mrp * item.quantityInBill; // Use mrp as selling price for subtotal
  const grandTotal = billItems.reduce((total, item) => total + calculateSubtotal(item), 0);

  const handleQuantityChange = (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = Math.max(1, currentQuantity + change); // Quantity cannot be less than 1
    onUpdateQuantity(itemId, newQuantity);
  };
  
  const handleDirectQuantityInput = (itemId: string, value: string) => {
    const newQuantity = parseInt(value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 1) {
      onUpdateQuantity(itemId, newQuantity);
    } else if (value === "") {
      onUpdateQuantity(itemId, 1);
    }
  };


  if (billItems.length === 0) {
    return (
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Current Bill
          </CardTitle>
          <CardDescription>No items added to the bill yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          Current Bill
        </CardTitle>
        <CardDescription>Review items and finalize the transaction.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-380px)] pr-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Item</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Price (MRP) (₹)</TableHead>
                <TableHead className="text-right">Total (₹)</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-sm py-2">{item.name}</TableCell>
                  <TableCell className="text-center py-2">
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleQuantityChange(item.id, item.quantityInBill, -1)}
                        disabled={item.quantityInBill <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantityInBill}
                        onChange={(e) => handleDirectQuantityInput(item.id, e.target.value)}
                        className="h-7 w-12 text-center px-1"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleQuantityChange(item.id, item.quantityInBill, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-2">INR ₹{item.mrp.toFixed(2)}</TableCell>
                  <TableCell className="text-right py-2">INR ₹{calculateSubtotal(item).toFixed(2)}</TableCell>
                  <TableCell className="text-center py-2">
                    <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)} className="text-destructive hover:text-destructive/80 h-7 w-7">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3 border-t pt-4">
        <div className="flex justify-between w-full text-lg font-semibold">
          <span>Grand Total:</span>
          <span>INR ₹{grandTotal.toFixed(2)}</span>
        </div>
        <Button onClick={onFinalizeBill} className="w-full" size="lg" disabled={isSubmitting || billItems.length === 0}>
          {isSubmitting ? "Processing..." : "Finalize Bill"}
        </Button>
      </CardFooter>
    </Card>
  );
}
