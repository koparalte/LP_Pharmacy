
"use client";

import { AddItemForm } from "./components/AddItemForm";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AddItemFormData = Omit<InventoryItem, 'id' | 'lastUpdated' >;


export default function AddInventoryItemPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const storedItems = localStorage.getItem('lpPharmacyInventory');
    if (storedItems) {
      try {
        setInventoryItems(JSON.parse(storedItems));
      } catch (e) {
        console.error("Failed to parse inventory from localStorage", e);
        setInventoryItems([]);
      }
    }
  }, []);

  const handleFormSubmit = async (data: AddItemFormData) => {
    console.log("New item data:", data);

    const newItem: InventoryItem = {
      ...data, 
      id: String(Date.now()), 
      lastUpdated: new Date().toISOString(),
      expiryDate: data.expiryDate ? data.expiryDate.toISOString().split('T')[0] : undefined,
      batchNo: data.batchNo || undefined,
      unit: data.unit || undefined,
    };

    const updatedItems = [...inventoryItems, newItem];
    localStorage.setItem('lpPharmacyInventory', JSON.stringify(updatedItems));
    setInventoryItems(updatedItems); 

    toast({
      title: "Item Added Successfully!",
      description: `${data.name} has been added to the inventory.`,
    });
    router.push("/inventory");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Add New Inventory Item</h1>
      <div className="p-6 border rounded-lg shadow-sm bg-card">
        <AddItemForm onFormSubmit={handleFormSubmit} />
      </div>
    </div>
  );
}
