
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, FieldValue as FirebaseFieldValue } from "firebase/firestore"; // Added FirebaseFieldValue
import { db } from "@/lib/firebase";
import type { InventoryItem } from "@/lib/types";
import { AddItemForm, type AddItemFormValues } from "@/app/(app)/inventory/add/components/AddItemForm";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { logInventoryMovement } from "@/lib/inventoryLogService";

export default function EditInventoryItemPage() {
  const router = useRouter();
  const params = useParams();
  const { itemId } = params as { itemId: string };
  const { toast } = useToast();

  const [itemData, setItemData] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (itemId) {
      const fetchItem = async () => {
        setLoading(true);
        try {
          const itemDocRef = doc(db, "inventory", itemId);
          const itemDocSnap = await getDoc(itemDocRef);

          if (itemDocSnap.exists()) {
            const fetchedData = itemDocSnap.data() as Omit<InventoryItem, 'id'>;
            setItemData({ 
              id: itemDocSnap.id, 
              ...fetchedData,
              rate: fetchedData.rate, 
              mrp: fetchedData.mrp, 
            } as InventoryItem);

          } else {
            toast({
              title: "Error",
              description: "Inventory item not found.",
              variant: "destructive",
            });
            router.push("/inventory");
          }
        } catch (error) {
          console.error("Error fetching item: ", error);
          toast({
            title: "Error Fetching Item",
            description: "Could not load item data. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };
      fetchItem();
    }
  }, [itemId, toast, router]);

  const handleFormSubmit = async (data: AddItemFormValues, originalItem?: InventoryItem) => {
    if (!originalItem) {
      toast({ title: "Error", description: "Original item data missing for update.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);

    try {
      const currentStock = originalItem.stock;
      const stockAdjustment = data.stockAdjustment || 0;
      const newStock = currentStock + stockAdjustment;

      if (newStock < 0) {
        // This is a warning, the operation will still proceed.
        // Consider if stock should actually go negative or be clamped at 0.
        // For now, it allows negative stock based on current logic.
        toast({
          title: "Stock Alert",
          description: `Stock for ${data.name} is now ${newStock}.`,
          variant: "default", 
        });
      }
      
      const itemDocRef = doc(db, "inventory", itemId);
      
      // Construct the payload carefully to handle optional fields for update
      const updatePayload: { [key: string]: any } = { // Use any for flexibility with FieldValue.delete()
        name: data.name,
        stock: newStock,
        lowStockThreshold: data.lowStockThreshold,
        rate: data.rate,
        mrp: data.mrp,
        lastUpdated: new Date().toISOString(),
      };

      // For optional string fields, update to new value or empty string if cleared
      // Firestore treats undefined in update as "do not change", so if it was "abc" and data.batchNo is undefined, it stays "abc"
      // If data.batchNo is "", it becomes ""
      updatePayload.batchNo = data.batchNo !== undefined ? data.batchNo : ""; 
      updatePayload.unit = data.unit !== undefined ? data.unit : "";

      // For optional date field, update to formatted date, or remove the field if cleared
      if (data.expiryDate) {
        updatePayload.expiryDate = format(data.expiryDate, "yyyy-MM-dd");
      } else {
        // If data.expiryDate is undefined (meaning user cleared it in the form)
        // Set to FieldValue.delete() to remove the field from Firestore document
        updatePayload.expiryDate = FirebaseFieldValue.delete();
      }
      
      await updateDoc(itemDocRef, updatePayload);

      if (stockAdjustment !== 0) {
        await logInventoryMovement({
          itemId: itemId,
          itemName: data.name,
          type: stockAdjustment > 0 ? 'in' : 'out',
          quantity: Math.abs(stockAdjustment),
          movementDate: format(new Date(), "yyyy-MM-dd"),
          source: 'stock_edit',
          reason: stockAdjustment > 0 
            ? `Stock increased by ${stockAdjustment} via edit` 
            : `Stock decreased by ${Math.abs(stockAdjustment)} via edit`,
        });
      }
      
      toast({
        title: "Item Updated Successfully!",
        description: `${data.name} has been updated. Stock movement logged if applicable.`,
      });
      router.push("/inventory");
    } catch (error) {
      console.error("Error updating item and logging movement: ", error);
      toast({
        title: "Error Updating Item",
        description: "There was an issue saving the changes or logging movement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="p-6 border rounded-lg shadow-sm bg-card space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="flex justify-end gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!itemData) {
    return <p>Item not found or error loading data.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
         <Button variant="outline" size="icon" onClick={() => router.back()} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
         </Button>
        <h1 className="text-3xl font-bold font-headline">Edit Inventory Item</h1>
      </div>
      <div className="p-6 border rounded-lg shadow-sm bg-card">
        <AddItemForm
          initialData={itemData}
          isEditMode={true}
          onFormSubmit={handleFormSubmit}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}
