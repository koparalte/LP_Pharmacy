
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle, UploadCloud } from "lucide-react";
import { InventoryFilters } from "./components/InventoryFilters";
import { InventoryTable } from "./components/InventoryTable";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

const INVENTORY_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const [lastFetchedInventory, setLastFetchedInventory] = useState<number | null>(null);

  const fetchInventoryItems = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && lastFetchedInventory && (Date.now() - lastFetchedInventory < INVENTORY_STALE_TIME)) {
      setLoading(false); // Already have recent data
      return;
    }

    setLoading(true);
    try {
      const inventoryCollection = collection(db, "inventory");
      const q = query(inventoryCollection, orderBy("name"));
      const querySnapshot = await getDocs(q);
      const inventoryList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as InventoryItem));
      setItems(inventoryList);
      setLastFetchedInventory(Date.now());
    } catch (error) {
      console.error("Error fetching inventory items: ", error);
      toast({
        title: "Error Fetching Inventory",
        description: "Could not load inventory data from the database.",
        variant: "destructive",
      });
      setItems([]); // Clear items on error
      setLastFetchedInventory(null); // Reset fetch time on error
    } finally {
      setLoading(false);
    }
  }, [toast, lastFetchedInventory]);

  useEffect(() => {
    fetchInventoryItems();
  }, [fetchInventoryItems]); // fetchInventoryItems dependency will change if lastFetchedInventory changes, which is intended.

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearchTerm = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (item.batchNo && item.batchNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                (item.unit && item.unit.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearchTerm;
    });
  }, [items, searchTerm]);


  const handleEditItem = (itemToEdit: InventoryItem) => {
    router.push(`/inventory/edit/${itemToEdit.id}`);
  };

  const handleDeleteItem = async (itemId: string) => {
    const originalItems = [...items];
    // Optimistically update UI
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    try {
      await deleteDoc(doc(db, "inventory", itemId));
      toast({
        title: "Item Deleted",
        description: "The inventory item has been successfully deleted.",
      });
      setLastFetchedInventory(null); // Invalidate cache as data changed
    } catch (error) {
      console.error("Error deleting item from Firestore: ", error);
      setItems(originalItems); // Revert UI on error
      toast({
        title: "Error Deleting Item",
        description: "Could not delete the item from the database. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Callback to allow other components (e.g., import page after successful import) to trigger a refresh
  const refreshInventory = () => {
    fetchInventoryItems(true); // Force refresh
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-headline">Inventory Management</h1>
        <div className="flex gap-2">
          <Button asChild size="lg" variant="outline">
            <Link href="/inventory/import">
              <UploadCloud className="mr-2 h-5 w-5" /> Import from CSV
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/inventory/add">
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Item
            </Link>
          </Button>
        </div>
      </div>

      <InventoryFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <InventoryTable items={filteredItems} onEdit={handleEditItem} onDelete={handleDeleteItem} />
      )}
    </div>
  );
}
