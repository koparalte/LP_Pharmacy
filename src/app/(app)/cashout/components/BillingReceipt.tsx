
"use client";

import type { BillItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, Minus, ShoppingCart, CreditCard, Landmark, Percent, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BillingReceiptProps {
  billItems: BillItem[];
  discountAmount: number;
  remarks: string;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onDiscountChange: (amount: number) => void;
  onRemarksChange: (remarks: string) => void;
  onMarkAsPaid: () => void;
  onMarkAsDebt: () => void;
  isSubmitting: boolean;
}

export function BillingReceipt({ 
  billItems, 
  discountAmount,
  remarks,
  onRemoveItem, 
  onUpdateQuantity, 
  onDiscountChange,
  onRemarksChange,
  onMarkAsPaid, 
  onMarkAsDebt, 
  isSubmitting 
}: BillingReceiptProps) {
  const calculateSubtotalForItem = (item: BillItem) => item.mrp * item.quantityInBill;
  const subTotal = billItems.reduce((total, item) => total + calculateSubtotalForItem(item), 0);
  
  const grandTotal = Math.max(0, subTotal - discountAmount);

  const handleQuantityChange = (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = Math.max(1, currentQuantity + change); 
    onUpdateQuantity(itemId, newQuantity);
  };
  
  const handleDiscountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      onDiscountChange(Math.min(value, subTotal)); // Cap discount at subTotal
    } else if (e.target.value === "") {
      onDiscountChange(0);
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
        <CardDescription>Review items, add discount, and finalize the transaction.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-560px)] pr-3"> {/* Adjusted height for remarks, discount, and two buttons */}
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
                      <span className="inline-block w-12 text-center text-sm font-medium">
                        {item.quantityInBill}
                      </span>
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
                  <TableCell className="text-right py-2">INR ₹{calculateSubtotalForItem(item).toFixed(2)}</TableCell>
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
        <div className="flex justify-between w-full text-md font-medium">
          <span>Subtotal:</span>
          <span>INR ₹{subTotal.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between w-full">
            <Label htmlFor="discountAmount" className="text-md font-medium flex items-center">
                <Percent className="mr-1 h-4 w-4 text-muted-foreground" /> Discount (₹):
            </Label>
            <Input
                id="discountAmount"
                type="number"
                value={discountAmount === 0 ? "" : discountAmount.toString()}
                onChange={handleDiscountInputChange}
                placeholder="0.00"
                className="w-32 text-right"
                min="0"
                step="0.01"
            />
        </div>
        
        <div className="flex justify-between w-full text-lg font-semibold mt-1">
          <span>Grand Total:</span>
          <span>INR ₹{grandTotal.toFixed(2)}</span>
        </div>
        
        <div className="w-full space-y-1.5 mt-2">
            <Label htmlFor="remarks" className="text-md font-medium flex items-center">
                <MessageSquare className="mr-1 h-4 w-4 text-muted-foreground" /> Remarks (Optional):
            </Label>
            <Textarea
                id="remarks"
                placeholder="E.g., Paid via UPI, Cash only..."
                value={remarks}
                onChange={(e) => onRemarksChange(e.target.value)}
                className="min-h-[60px]"
            />
        </div>

        <div className="grid grid-cols-2 gap-2 w-full pt-2">
            <Button onClick={onMarkAsPaid} size="lg" disabled={isSubmitting || billItems.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
                <CreditCard className="mr-2 h-5 w-5" /> {isSubmitting ? "Processing..." : "Mark as Paid"}
            </Button>
            <Button onClick={onMarkAsDebt} size="lg" variant="outline" disabled={isSubmitting || billItems.length === 0} className="border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600">
                <Landmark className="mr-2 h-5 w-5" /> {isSubmitting ? "Processing..." : "Mark as Debt"}
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
