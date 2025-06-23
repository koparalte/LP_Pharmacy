
"use client";

import { AddItemForm, type AddItemFormValues } from "./components/AddItemForm";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, setDoc, serverTimestamp, FieldValue } from "firebase/firestore";
import { useState } from "react";
import { format } from "date-fns";
import { logInventoryMovement } from "@/lib/inventoryLogService";
import { useAuth } from "@/hooks/useAuth"; 

export default function AddInventoryItemPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth(); 

  const handleFormSubmit = async (data: AddItemFormValues) => {
    setIsSubmitting(true);

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to add items.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const inventoryCollectionRef = collection(db, "inventory");
    
    try {
      const payload: Partial<Omit<InventoryItem, 'id'>> = {
        name: data.name,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        rate: data.rate,
        mrp: data.mrp,
        lastUpdated: new Date().toISOString(),
      };

      if (data.batchNo !== undefined) payload.batchNo = data.batchNo;
      if (data.unit !== undefined) payload.unit = data.unit;
      if (data.expiryDate) payload.expiryDate = format(data.expiryDate, "yyyy-MM-dd");
      
      const addedDocRef = await addDoc(inventoryCollectionRef, payload as Omit<InventoryItem, 'id'>);

      if (data.stock > 0) {
        await logInventoryMovement({
          itemId: addedDocRef.id, 
          itemName: data.name,
          type: 'in',
          quantity: data.stock,
          movementDate: format(new Date(), "yyyy-MM-dd"),
          source: 'initial_stock',
          reason: 'Initial stock for new item',
          movedByUserId: user.uid,
          movedByUserName: user.displayName || user.email || "Unknown User",
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
        Use this form to add a new, distinct item to your inventory. Each item added creates a unique record. Items with the same name but different units, batch numbers, or expiry dates will be treated as separate entries.
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
