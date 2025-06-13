
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { InventoryItem } from "@/lib/types";
import { AddItemForm, type AddItemFormValues } from "@/app/(app)/inventory/add/components/AddItemForm";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
            setItemData({ id: itemDocSnap.id, ...itemDocSnap.data() } as InventoryItem);
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
      return;
    }
    setIsSubmitting(true);

    try {
      const currentStock = originalItem.stock;
      const stockAdjustment = data.stockAdjustment || 0;
      const newStock = currentStock + stockAdjustment;

      if (newStock < 0) {
        toast({
          title: "Invalid Stock Adjustment",
          description: "Stock cannot be negative after adjustment.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      const { stockAdjustment: _, ...updatePayloadBase } = data;


      // Explicitly construct payload to ensure description is not included if it was in 'data' accidentally
      const updatePayload: Omit<Partial<InventoryItem>, 'description'> = {
        name: updatePayloadBase.name,
        batchNo: updatePayloadBase.batchNo || undefined,
        unit: updatePayloadBase.unit || undefined,
        stock: newStock,
        lowStockThreshold: updatePayloadBase.lowStockThreshold,
        rate: updatePayloadBase.rate,
        mrp: updatePayloadBase.mrp,
        expiryDate: updatePayloadBase.expiryDate ? updatePayloadBase.expiryDate.toISOString().split('T')[0] : undefined,
        lastUpdated: new Date().toISOString(),
      };
      
      const itemDocRef = doc(db, "inventory", itemId);
      await updateDoc(itemDocRef, updatePayload);

      toast({
        title: "Item Updated Successfully!",
        description: `${data.name} has been updated.`,
      });
      router.push("/inventory");
    } catch (error) {
      console.error("Error updating item: ", error);
      toast({
        title: "Error Updating Item",
        description: "There was an issue saving the changes. Please try again.",
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
          {/* <Skeleton className="h-20 w-full" /> Description Skeleton Removed */}
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
    // Should be handled by useEffect redirect, but as a fallback
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
