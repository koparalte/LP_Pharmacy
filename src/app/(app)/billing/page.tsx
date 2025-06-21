
"use client";

import { useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { OrderItemSelector } from "./components/OrderItemSelector";
import { CurrentBill } from "./components/CurrentBill";
import { BillFinalization, type BillFinalizationFormValues } from "./components/BillFinalization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryItem, BillInProgressItem, FinalizedBill, BillItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, Timestamp } from "firebase/firestore";
import { logInventoryMovement } from "@/lib/inventoryLogService";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export default function BillingPage() {
  const [billItems, setBillItems] = useState<BillInProgressItem[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleAddItem = (item: InventoryItem) => {
    setBillItems(prev => {
      const existingItem = prev.find(i => i.id === item.id);
      if (existingItem) {
        toast({ title: "Item Already Added", description: `${item.name} is already in the bill. You can adjust the quantity there.` });
        return prev;
      }
      return [...prev, { ...item, quantityInBill: 1 }];
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setBillItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setBillItems(prev => prev.map(item => {
      if (item.id === itemId) {
        if (newQuantity > item.stock) {
          toast({ title: "Stock Limit Exceeded", description: `Cannot add more than available stock (${item.stock}).`, variant: "destructive" });
          return { ...item, quantityInBill: item.stock };
        }
        return { ...item, quantityInBill: newQuantity < 1 ? 1 : newQuantity };
      }
      return item;
    }));
  };

  const subTotal = useMemo(() => {
    return billItems.reduce((acc, item) => acc + (item.mrp * item.quantityInBill), 0);
  }, [billItems]);
  
  const handleFinalizeBill = async (formData: BillFinalizationFormValues, grandTotal: number, remainingBalance: number, amountActuallyPaid: number) => {
    setIsFinalizing(true);
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to finalize a bill.", variant: "destructive" });
        setIsFinalizing(false);
        return;
    }
    
    if (billItems.length === 0) {
        toast({ title: "Empty Bill", description: "Cannot finalize an empty bill.", variant: "destructive" });
        setIsFinalizing(false);
        return;
    }

    const batch = writeBatch(db);
    const movementPromises: Promise<void>[] = [];
    const newBillRef = doc(collection(db, "finalizedBills"));
    const currentDate = new Date();
    const formattedDate = format(currentDate, "yyyy-MM-dd");

    // 1. Prepare inventory updates
    for (const item of billItems) {
      const inventoryItemRef = doc(db, "inventory", item.id);
      const newStock = item.stock - item.quantityInBill;
      if (newStock < 0) {
        toast({
          title: "Stock Error",
          description: `Not enough stock for ${item.name}. Please review the bill.`,
          variant: "destructive",
        });
        setIsFinalizing(false);
        return;
      }
      batch.update(inventoryItemRef, { stock: newStock });

      // 2. Prepare movement logs
       movementPromises.push(logInventoryMovement({
          itemId: item.id,
          itemName: item.name,
          type: 'out',
          quantity: item.quantityInBill,
          movementDate: formattedDate,
          source: 'sale',
          reason: `Sale - Bill ID: ${newBillRef.id}`,
          movedByUserId: user.uid,
          movedByUserName: user.displayName || user.email || 'Unknown User',
      }));
    }

    // 3. Prepare finalized bill data
    const finalizedBillPayload: Omit<FinalizedBill, 'id'> = {
      date: currentDate.toISOString(),
      items: billItems.map(({ stock, lowStockThreshold, lastUpdated, ...billItemData }) => billItemData), // strip inventory-specific fields
      subTotal,
      discountAmount: formData.discountAmount || 0,
      grandTotal,
      customerName: formData.customerName || "Walk-in Customer",
      customerAddress: formData.customerAddress || "",
      status: grandTotal > amountActuallyPaid ? 'debt' : 'paid',
      amountActuallyPaid,
      remainingBalance,
      remarks: formData.remarks || "",
    };

    batch.set(newBillRef, finalizedBillPayload);

    // 4. Commit batch and log movements
    try {
      await batch.commit();
      await Promise.all(movementPromises);

      toast({
        title: "Bill Finalized!",
        description: "The bill has been saved and inventory updated.",
      });
      
      // 5. Reset state and redirect
      setBillItems([]);
      router.push(`/print-bill/${newBillRef.id}`);

    } catch (error) {
      console.error("Error finalizing bill: ", error);
      toast({
        title: "Finalization Failed",
        description: "An error occurred while saving the bill. Inventory was not updated.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const billItemIds = useMemo(() => billItems.map(item => item.id), [billItems]);

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow min-h-0">
          <OrderItemSelector onAddItem={handleAddItem} disabledItems={billItemIds} />
          <CurrentBill
            items={billItems}
            onQuantityChange={handleQuantityChange}
            onRemoveItem={handleRemoveItem}
            subTotal={subTotal}
          />
      </div>

      <div className="flex-shrink-0">
          <Card>
              <CardHeader>
                  <CardTitle>Finalize Bill</CardTitle>
              </CardHeader>
              <CardContent>
                  <BillFinalization 
                      billItems={billItems} 
                      subTotal={subTotal}
                      onFinalize={handleFinalizeBill}
                      isProcessing={isFinalizing}
                  />
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
