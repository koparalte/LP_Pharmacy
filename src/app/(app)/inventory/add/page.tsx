
"use client";

import { AddItemForm, type AddItemFormValues } from "./components/AddItemForm";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc } from "firebase/firestore"; // Removed writeBatch as it's not used directly here for single add
import { useState } from "react";
import { format } from "date-fns";
import { logInventoryMovement } from "@/lib/inventoryLogService";

export default function AddInventoryItemPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (data: AddItemFormValues) => {
    setIsSubmitting(true);

    const inventoryCollectionRef = collection(db, "inventory");
    const newInventoryItemDocRef = doc(inventoryCollectionRef); // Generate ID upfront for logging

    try {
      const payload: Partial<Omit<InventoryItem, 'id'>> = { // Use Partial for easier conditional assignment
        name: data.name,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        rate: data.rate,
        mrp: data.mrp,
        lastUpdated: new Date().toISOString(),
      };

      // Conditionally add optional fields to avoid 'undefined' values
      if (data.batchNo !== undefined) {
        payload.batchNo = data.batchNo; // Allows "" (empty string)
      }
      if (data.unit !== undefined) {
        payload.unit = data.unit; // Allows "" (empty string)
      }
      if (data.expiryDate) {
        payload.expiryDate = format(data.expiryDate, "yyyy-MM-dd");
      }
      
      // Use the pre-generated doc ref with setDoc, or addDoc and get the ID after for logging
      // For simplicity with pre-generated ID for logging:
      // await setDoc(newInventoryItemDocRef, payload as Omit<InventoryItem, 'id'>);
      // Or, if using addDoc and need ID after:
      const addedDocRef = await addDoc(inventoryCollectionRef, payload as Omit<InventoryItem, 'id'>);


      if (data.stock > 0) {
        await logInventoryMovement({
          itemId: addedDocRef.id, // Use ID from the actually added document
          itemName: data.name,
          type: 'in',
          quantity: data.stock,
          movementDate: format(new Date(), "yyyy-MM-dd"),
          source: 'initial_stock',
          reason: 'Initial stock for new item',
        });
      }
      
      toast({
        title: "Item Added Successfully!",
        description: `${data.name} has been added as a distinct record to the inventory. Initial stock movement logged.`,
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
      <p className="text-sm text-muted-foreground">
        Use this form to add a new, distinct item to your inventory. Items with the same name but different units or expiry dates will be treated as separate records.
      </p>
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
