
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteField, FieldValue } from "firebase/firestore"; 
import { db } from "@/lib/firebase";
import type { InventoryItem } from "@/lib/types";
import { AddItemForm, type AddItemFormValues } from "@/app/(app)/inventory/add/components/AddItemForm";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { logInventoryMovement } from "@/lib/inventoryLogService";
import { useAuth } from "@/hooks/useAuth"; 

export default function EditInventoryItemPage() {
  const router = useRouter();
  const params = useParams();
  const { itemId } = params as { itemId: string };
  const { toast } = useToast();
  const { user, isAdmin } = useAuth(); 

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
    setIsSubmitting(true);
    if (!originalItem) {
      toast({ title: "Error", description: "Original item data missing for update.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to edit items.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    

    try {
      const currentStock = originalItem.stock;
      const stockAdjustment = data.stockAdjustment || 0;
      const newStock = currentStock + stockAdjustment;

      if (newStock < 0) {
        toast({
          title: "Stock Alert",
          description: `Stock for ${data.name} is now ${newStock}. Proceeding with update.`,
          variant: "default", 
        });
      }
      
      const itemDocRef = doc(db, "inventory", itemId);
      
      const updatePayload: { [key: string]: any } = { 
        name: data.name,
        stock: newStock,
        lowStockThreshold: data.lowStockThreshold,
        rate: isAdmin ? data.rate : originalItem.rate, // Only update rate if admin
        mrp: data.mrp,
        lastUpdated: new Date().toISOString(),
      };

      updatePayload.batchNo = data.batchNo !== undefined ? data.batchNo : ""; 
      updatePayload.unit = data.unit !== undefined ? data.unit : "";

      if (data.expiryDate) {
        updatePayload.expiryDate = format(data.expiryDate, "yyyy-MM-dd");
      } else {
        updatePayload.expiryDate = deleteField();
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
          movedByUserId: user.uid,
          movedByUserName: user.displayName || user.email || "Unknown User",
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
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
