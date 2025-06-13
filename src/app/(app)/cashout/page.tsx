
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { InventoryItem, BillItem, FinalizedBill } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, PackageSearch } from "lucide-react";
import { InventoryBillingTableRow } from "./components/InventoryBillingTableRow";
import { BillingReceipt } from "./components/BillingReceipt";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, orderBy, runTransaction } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";


export default function BillingPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const { toast } = useToast();

  const fetchInventoryForBilling = useCallback(async () => {
    setLoadingInventory(true);
    try {
      const inventoryCollection = collection(db, "inventory");
      const q = query(inventoryCollection, orderBy("name"));
      const querySnapshot = await getDocs(q);
      const inventoryList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as InventoryItem));
      setInventory(inventoryList);
    } catch (error) {
      console.error("Error fetching inventory for billing: ", error);
      toast({
        title: "Error Fetching Inventory",
        description: "Could not load inventory for billing.",
        variant: "destructive",
      });
      setInventory([]);
    } finally {
      setLoadingInventory(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInventoryForBilling();
  }, [fetchInventoryForBilling]);


  const handleAddItemToBill = (itemToAdd: InventoryItem) => {
    if (itemToAdd.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${itemToAdd.name} is currently out of stock.`,
        variant: "destructive",
      });
      return;
    }

    setBillItems((prevBillItems) => {
      const existingItem = prevBillItems.find((item) => item.id === itemToAdd.id);
      if (existingItem) {
        if (existingItem.quantityInBill < itemToAdd.stock) {
          return prevBillItems.map((item) =>
            item.id === itemToAdd.id
              ? { ...item, quantityInBill: item.quantityInBill + 1 }
              : item
          );
        } else {
           toast({
            title: "Stock Limit Reached",
            description: `Cannot add more ${itemToAdd.name}. Available stock: ${itemToAdd.stock}.`,
            variant: "destructive",
          });
          return prevBillItems;
        }
      } else {
        // Create a new BillItem with only the fields defined in the BillItem type
        const newBillItem: BillItem = {
          id: itemToAdd.id,
          name: itemToAdd.name,
          batchNo: itemToAdd.batchNo,
          unit: itemToAdd.unit,
          rate: itemToAdd.rate, // Cost price
          mrp: itemToAdd.mrp,   // Selling price (MRP)
          quantityInBill: 1,
          expiryDate: itemToAdd.expiryDate,
        };
        return [...prevBillItems, newBillItem];
      }
    });
  };

  const handleRemoveItemFromBill = (itemId: string) => {
    setBillItems((prevBillItems) => prevBillItems.filter((item) => item.id !== itemId));
  };

  const handleUpdateItemQuantity = (itemId: string, newQuantity: number) => {
    setBillItems((prevBillItems) =>
      prevBillItems.map((item) => {
        const originalInventoryItem = inventory.find(invItem => invItem.id === itemId);
        const maxStock = originalInventoryItem ? originalInventoryItem.stock : item.quantityInBill; 

        if (item.id === itemId) {
          if (newQuantity > maxStock) {
            toast({
              title: "Stock Limit Exceeded",
              description: `Cannot set quantity for ${item.name} to ${newQuantity}. Available stock: ${maxStock}.`,
              variant: "destructive",
            });
            return { ...item, quantityInBill: maxStock };
          }
          return { ...item, quantityInBill: Math.max(1, newQuantity) };
        }
        return item;
      })
    );
  };

  const handleFinalizeBill = async () => {
    if (billItems.length === 0) {
      toast({
        title: "Empty Bill",
        description: "Please add items to the bill before finalizing.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingBill(true);

    try {
      await runTransaction(db, async (transaction) => {
        const inventoryUpdates: { docRef: any, newStock: number }[] = [];

        for (const bItem of billItems) {
          const itemDocRef = doc(db, "inventory", bItem.id);
          const itemDoc = await transaction.get(itemDocRef);

          if (!itemDoc.exists()) {
            throw new Error(`Item ${bItem.name} (ID: ${bItem.id}) not found in inventory.`);
          }
          const inventoryItemData = itemDoc.data() as InventoryItem;

          if (bItem.quantityInBill > inventoryItemData.stock) {
            throw new Error(`Not enough stock for ${bItem.name}. Available: ${inventoryItemData.stock}, Requested: ${bItem.quantityInBill}.`);
          }
          const newStock = inventoryItemData.stock - bItem.quantityInBill;
          inventoryUpdates.push({ docRef: itemDocRef, newStock });
        }

        for (const update of inventoryUpdates) {
          transaction.update(update.docRef, { stock: update.newStock, lastUpdated: new Date().toISOString() });
        }

        const grandTotal = billItems.reduce((total, item) => total + (item.mrp * item.quantityInBill), 0); // Use mrp as selling price for grandTotal

        const billItemsForPayload: BillItem[] = billItems.map(bi => ({
          id: bi.id,
          name: bi.name,
          batchNo: bi.batchNo,
          unit: bi.unit,
          rate: bi.rate, // cost price
          mrp: bi.mrp,   // selling price (MRP)
          quantityInBill: bi.quantityInBill,
          expiryDate: bi.expiryDate,
        }));
        
        const customBillId = `LP${new Date().getTime().toString().slice(-7)}`;

        const newFinalizedBillPayload: Omit<FinalizedBill, 'id'> = {
          date: new Date().toISOString(),
          items: billItemsForPayload,
          grandTotal: grandTotal,
          customerName: "Walk-in Customer",
          customerAddress: "N/A",
        };
        const finalizedBillCollection = collection(db, "finalizedBills");
        transaction.set(doc(finalizedBillCollection, customBillId), newFinalizedBillPayload);
      });

      const updatedLocalInventory = inventory.map(invItem => {
        const billItem = billItems.find(bi => bi.id === invItem.id);
        if (billItem) {
          return { ...invItem, stock: Math.max(0, invItem.stock - billItem.quantityInBill) };
        }
        return invItem;
      });
      setInventory(updatedLocalInventory);

      setBillItems([]);

      toast({
        title: "Bill Finalized!",
        description: "The bill has been processed, inventory updated, and sales record saved.",
      });

    } catch (error: any) {
      console.error("Error finalizing bill: ", error);
      toast({
        title: "Error Finalizing Bill",
        description: error.message || "Could not process the bill. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingBill(false);
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batchNo && item.batchNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.unit && item.unit.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [inventory, searchTerm]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-110px)]">
      <div className="lg:w-3/5 space-y-4 flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Create Bill</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search inventory by name, batch no, or unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="flex-grow rounded-md border">
          {loadingInventory ? (
            <div className="space-y-1 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredInventory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">MRP (Sell Price) (₹)</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-center w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => {
                  const billItem = billItems.find(bi => bi.id === item.id);
                  const isOutOfStock = item.stock <= 0;
                  const isMaxInBill = billItem ? billItem.quantityInBill >= item.stock : false;

                  return (
                    <InventoryBillingTableRow
                      key={item.id}
                      item={item}
                      onAddItemToBill={handleAddItemToBill}
                      isOutOfStock={isOutOfStock}
                      isMaxInBill={isMaxInBill}
                    />
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 h-full">
              <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Items Found</h3>
              <p className="text-muted-foreground">
                No inventory items match your search, or the inventory is empty.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="lg:w-2/5">
        <BillingReceipt
          billItems={billItems}
          onRemoveItem={handleRemoveItemFromBill}
          onUpdateQuantity={handleUpdateItemQuantity}
          onFinalizeBill={handleFinalizeBill}
          isSubmitting={isSubmittingBill}
        />
      </div>
    </div>
  );
}
