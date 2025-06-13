
"use client";

import { AddItemForm, type AddItemFormValues } from "./components/AddItemForm";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useState } from "react";

export default function AddInventoryItemPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (data: AddItemFormValues) => {
    setIsSubmitting(true);

    try {
      const newItemPayload: Omit<InventoryItem, 'id'> = {
        name: data.name,
        batchNo: data.batchNo || undefined,
        unit: data.unit || undefined,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        rate: data.rate, // This is now cost price
        sellingPrice: data.sellingPrice, // This is the new selling price
        mrp: data.mrp,
        expiryDate: data.expiryDate ? data.expiryDate.toISOString().split('T')[0] : undefined,
        lastUpdated: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "inventory"), newItemPayload);

      toast({
        title: "Item Added Successfully!",
        description: `${data.name} has been added to the inventory with ID: ${docRef.id}.`,
      });
      router.push("/inventory");
    } catch (error) {
      console.error("Error adding item to Firestore: ", error);
      toast({
        title: "Error Adding Item",
        description: "There was an issue saving the item to the database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Add New Inventory Item</h1>
      <div className="p-6 border rounded-lg shadow-sm bg-card">
        <AddItemForm 
          onFormSubmit={handleFormSubmit} 
          isEditMode={false} 
          isLoading={isSubmitting} 
        />
      </div>
    </div>
  );
}

