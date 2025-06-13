
"use client";

import { AddItemForm, type AddItemFormValues } from "./components/AddItemForm";
import type { InventoryItem, InventoryMovement } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { format } from "date-fns";

export default function AddInventoryItemPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (data: AddItemFormValues) => {
    setIsSubmitting(true);

    const batch = writeBatch(db);

    try {
      const newInventoryItemRef = doc(collection(db, "inventory"));
      const newItemPayload: Omit<InventoryItem, 'id'> = {
        name: data.name,
        batchNo: data.batchNo || undefined,
        unit: data.unit || undefined,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        rate: data.rate, // Cost price
        mrp: data.mrp,   // Selling price (MRP)
        expiryDate: data.expiryDate ? format(data.expiryDate, "yyyy-MM-dd") : undefined,
        lastUpdated: new Date().toISOString(),
      };
      batch.set(newInventoryItemRef, newItemPayload);

      // Log inventory movement for initial stock
      if (data.stock > 0) {
        const newMovementRef = doc(collection(db, "inventoryMovements"));
        const movementPayload: Omit<InventoryMovement, 'id'> = {
          itemId: newInventoryItemRef.id,
          itemName: data.name,
          type: 'in',
          quantity: data.stock,
          movementDate: format(new Date(), "yyyy-MM-dd"),
          source: 'initial_stock',
          reason: 'Initial stock for new item',
          recordedAt: new Date().toISOString(),
        };
        batch.set(newMovementRef, movementPayload);
      }
      
      await batch.commit();

      toast({
        title: "Item Added Successfully!",
        description: `${data.name} has been added to the inventory with ID: ${newInventoryItemRef.id}. Initial stock movement logged.`,
      });
      router.push("/inventory");
    } catch (error) {
      console.error("Error adding item and logging movement: ", error);
      toast({
        title: "Error Adding Item",
        description: "There was an issue saving the item or logging its movement. Please try again.",
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
