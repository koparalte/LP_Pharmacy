"use client";

import { AddItemForm } from "./components/AddItemForm";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AddInventoryItemPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Load items from localStorage to append new item
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

  const handleFormSubmit = async (data: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    // In a real app, you would send this data to your backend API
    console.log("New item data:", data);

    const newItem: InventoryItem = {
      ...data,
      id: String(Date.now()), // Simple unique ID for mock
      lastUpdated: new Date().toISOString(),
      expiryDate: data.expiryDate ? data.expiryDate.toISOString().split('T')[0] : undefined, // Format date correctly
    };

    const updatedItems = [...inventoryItems, newItem];
    localStorage.setItem('lpPharmacyInventory', JSON.stringify(updatedItems));
    setInventoryItems(updatedItems); // Update state for current session if needed elsewhere

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
