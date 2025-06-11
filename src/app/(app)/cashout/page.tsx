
"use client";

import { useState, useEffect, useMemo } from "react";
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

const fallbackInventoryItems: InventoryItem[] = [
  { id: "fb1", name: "Amoxicillin 250mg", batchNo: "FBAMX001", description: "Antibiotic", stock: 15, lowStockThreshold: 20, unitPrice: 50.50, expiryDate: "2024-12-31", lastUpdated: new Date().toISOString() },
  { id: "fb2", name: "Ibuprofen 200mg", batchNo: "FBIBU002", description: "Pain reliever", stock: 50, lowStockThreshold: 30, unitPrice: 20.20, expiryDate: "2025-06-30", lastUpdated: new Date().toISOString() },
  { id: "fb3", name: "Vitamin C 1000mg", description: "Supplement", stock: 5, lowStockThreshold: 10, unitPrice: 10.10, lastUpdated: new Date().toISOString() },
  { id: "fb4", name: "Paracetamol 500mg", batchNo: "FBPAR003", description: "Fever reducer", stock: 0, lowStockThreshold: 10, unitPrice: 15.00, lastUpdated: new Date().toISOString() },
];

const INVENTORY_STORAGE_KEY = 'lpPharmacyInventory';
const FINALIZED_BILLS_STORAGE_KEY = 'lpPharmacyFinalizedBills';

export default function BillingPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let storedInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);
    let parsedInventory: InventoryItem[] = [];
    if (storedInventory) {
      try {
        const tempParsed = JSON.parse(storedInventory);
        // Ensure it's an array and not empty before setting, otherwise use fallback
        if (Array.isArray(tempParsed) && tempParsed.length > 0) {
          parsedInventory = tempParsed;
        } else {
          parsedInventory = fallbackInventoryItems;
          localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(parsedInventory)); 
        }
      } catch (e) {
        console.error("Failed to parse inventory from localStorage", e);
        parsedInventory = fallbackInventoryItems; 
        localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(parsedInventory)); 
      }
    } else {
      parsedInventory = fallbackInventoryItems; 
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(parsedInventory)); 
    }
    setInventory(parsedInventory);
  }, []);

  const updateInventoryInStorage = (updatedInventory: InventoryItem[]) => {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(updatedInventory));
    setInventory(updatedInventory);
  };

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
        return [...prevBillItems, { ...itemToAdd, quantityInBill: 1 }];
      }
    });
  };

  const handleRemoveItemFromBill = (itemId: string) => {
    setBillItems((prevBillItems) => prevBillItems.filter((item) => item.id !== itemId));
  };

  const handleUpdateItemQuantity = (itemId: string, newQuantity: number) => {
    setBillItems((prevBillItems) =>
      prevBillItems.map((item) => {
        if (item.id === itemId) {
          if (newQuantity > item.stock) {
            toast({
              title: "Stock Limit Exceeded",
              description: `Cannot set quantity for ${item.name} to ${newQuantity}. Available stock: ${item.stock}.`,
              variant: "destructive",
            });
            return { ...item, quantityInBill: item.stock }; 
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
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    const updatedInventory = inventory.map(invItem => {
      const billItem = billItems.find(bi => bi.id === invItem.id);
      if (billItem) {
        return { ...invItem, stock: Math.max(0, invItem.stock - billItem.quantityInBill) };
      }
      return invItem;
    });

    const grandTotal = billItems.reduce((total, item) => total + (item.unitPrice * item.quantityInBill), 0);
    const newFinalizedBill: FinalizedBill = {
      id: String(Date.now()), 
      date: new Date().toISOString(),
      items: [...billItems],
      grandTotal: grandTotal,
      customerName: "Walk-in Customer", 
      customerAddress: "N/A", 
    };

    const existingFinalizedBillsRaw = localStorage.getItem(FINALIZED_BILLS_STORAGE_KEY);
    let existingFinalizedBills: FinalizedBill[] = [];
    if (existingFinalizedBillsRaw) {
      try {
        existingFinalizedBills = JSON.parse(existingFinalizedBillsRaw);
      } catch (e) {
        console.error("Failed to parse finalized bills from localStorage", e);
      }
    }
    const updatedFinalizedBills = [...existingFinalizedBills, newFinalizedBill];
    localStorage.setItem(FINALIZED_BILLS_STORAGE_KEY, JSON.stringify(updatedFinalizedBills));

    updateInventoryInStorage(updatedInventory);
    setBillItems([]); 

    toast({
      title: "Bill Finalized!",
      description: "The bill has been processed, inventory updated, and sales record saved.",
    });
    setIsSubmittingBill(false);
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || (item.batchNo && item.batchNo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [inventory, searchTerm]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-110px)]">
      <div className="lg:w-3/5 space-y-4 flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Create Bill</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search inventory by name or batch no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="flex-grow rounded-md border">
          {filteredInventory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
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
