
"use client";

import { AddItemForm } from "./components/AddItemForm";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type AddItemFormData = Omit<InventoryItem, 'id' | 'lastUpdated' >;


export default function AddInventoryItemPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleFormSubmit = async (data: AddItemFormData) => {
    console.log("New item data for Firestore:", data);

    try {
      const newItemPayload: Omit<InventoryItem, 'id'> = {
        ...data,
        expiryDate: data.expiryDate ? data.expiryDate.toISOString().split('T')[0] : undefined,
        batchNo: data.batchNo || undefined,
        unit: data.unit || undefined,
        lastUpdated: new Date().toISOString(), // Or use serverTimestamp for Firestore native timestamp
      };

      const docRef = await addDoc(collection(db, "inventory"), {
        ...newItemPayload,
        // For Firestore native timestamp, you'd use:
        // lastUpdated: serverTimestamp(), 
      });

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
    }
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
