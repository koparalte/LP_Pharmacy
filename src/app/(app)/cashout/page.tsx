
"use client";

import { useState, useEffect, useMemo } from "react";
import type { InventoryItem, BillItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, AlertTriangle } from "lucide-react";
import { InventoryItemCard } from "./components/InventoryItemCard";
import { BillingReceipt } from "./components/BillingReceipt";

// Fallback mock data for inventory if localStorage is empty
const fallbackInventoryItems: InventoryItem[] = [
  { id: "fb1", name: "Amoxicillin 250mg", description: "Antibiotic", category: "Antibiotics", supplier: "Pharma Co", stock: 15, lowStockThreshold: 20, unitPrice: 50.50, expiryDate: "2024-12-31", tags: ["antibiotic", "prescription"], lastUpdated: new Date().toISOString() },
  { id: "fb2", name: "Ibuprofen 200mg", description: "Pain reliever", category: "Pain Relief", supplier: "Health Inc", stock: 50, lowStockThreshold: 30, unitPrice: 20.20, expiryDate: "2025-06-30", tags: ["otc", "painkiller"], lastUpdated: new Date().toISOString() },
  { id: "fb3", name: "Vitamin C 1000mg", description: "Supplement", category: "Vitamins", supplier: "Wellness Ltd", stock: 5, lowStockThreshold: 10, unitPrice: 10.10, tags: ["supplement", "otc"], lastUpdated: new Date().toISOString() },
  { id: "fb4", name: "Paracetamol 500mg", description: "Fever reducer", category: "Pain Relief", supplier: "MediSupply", stock: 0, lowStockThreshold: 10, unitPrice: 15.00, tags: ["otc", "fever"], lastUpdated: new Date().toISOString() },
];

const INVENTORY_STORAGE_KEY = 'lpPharmacyInventory';

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
        parsedInventory = JSON.parse(storedInventory);
      } catch (e) {
        console.error("Failed to parse inventory from localStorage", e);
        parsedInventory = fallbackInventoryItems; // Use fallback on error
      }
    } else {
      parsedInventory = fallbackInventoryItems; // Use fallback if nothing in storage
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(parsedInventory)); // Optionally pre-populate
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
            return { ...item, quantityInBill: item.stock }; // Cap at available stock
          }
          return { ...item, quantityInBill: Math.max(1, newQuantity) }; // Ensure quantity is at least 1
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
    
    // Simulate API call & stock update
    await new Promise(resolve => setTimeout(resolve, 1000));

    const updatedInventory = inventory.map(invItem => {
      const billItem = billItems.find(bi => bi.id === invItem.id);
      if (billItem) {
        return { ...invItem, stock: Math.max(0, invItem.stock - billItem.quantityInBill) };
      }
      return invItem;
    });

    updateInventoryInStorage(updatedInventory);
    setBillItems([]); // Clear the bill

    toast({
      title: "Bill Finalized!",
      description: "The bill has been processed and inventory updated.",
    });
    setIsSubmittingBill(false);
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventory, searchTerm]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-110px)]"> {/* Adjusted for header height */}
      {/* Inventory Selection Area */}
      <div className="lg:w-3/5 space-y-4 flex flex-col">
        <h1 className="text-3xl font-bold font-headline">Create Bill</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search inventory items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="flex-grow rounded-md border">
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredInventory.length > 0 ? (
              filteredInventory.map((item) => {
                const billItem = billItems.find(bi => bi.id === item.id);
                const currentStockForItem = item.stock - (billItem?.quantityInBill || 0);
                const effectiveStockDisplay = item.stock; // Show original stock on card
                 const isOutOfStockForNewAddition = item.stock <= 0;


                // Check if item in bill already uses up all stock
                const isMaxInBill = billItem ? billItem.quantityInBill >= item.stock : false;


                return (
                    <InventoryItemCard
                    key={item.id}
                    item={{...item, stock: effectiveStockDisplay}} // Pass item with its current real stock for display
                    onAddItemToBill={handleAddItemToBill}
                    isOutOfStock={isOutOfStockForNewAddition || isMaxInBill}
                    />
                );
                })
            ) : (
              <div className="col-span-full text-center py-10">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No inventory items match your search, or inventory is empty.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Billing Receipt Area */}
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
