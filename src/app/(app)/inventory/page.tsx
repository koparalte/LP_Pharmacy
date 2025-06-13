
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle, UploadCloud } from "lucide-react"; // Added UploadCloud
import { InventoryFilters } from "./components/InventoryFilters";
import { InventoryTable } from "./components/InventoryTable";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const fetchInventoryItems = useCallback(async () => {
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
    } catch (error) {
      console.error("Error fetching inventory items: ", error);
      toast({
        title: "Error Fetching Inventory",
        description: "Could not load inventory data from the database.",
        variant: "destructive",
      });
      setItems([]); 
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInventoryItems();
  }, [fetchInventoryItems]);

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
    try {
      await deleteDoc(doc(db, "inventory", itemId));
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
      toast({
        title: "Item Deleted",
        description: "The inventory item has been successfully deleted from Firestore.",
      });
    } catch (error) {
      console.error("Error deleting item from Firestore: ", error);
      toast({
        title: "Error Deleting Item",
        description: "Could not delete the item from the database. Please try again.",
        variant: "destructive",
      });
    }
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
