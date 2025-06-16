
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
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  type DocumentSnapshot,
} from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 15;

export default function InventoryPage() {
  const [currentItems, setCurrentItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [firstVisibleDoc, setFirstVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);


  const fetchInventoryPage = useCallback(async (
    page: number,
    direction: 'initial' | 'next' | 'prev',
    currentFirstDoc: DocumentSnapshot | null,
    currentLastDoc: DocumentSnapshot | null
  ) => {
    setIsLoadingItems(true);

    try {
      const inventoryCollectionRef = collection(db, "inventory");
      let q;

      if (direction === 'initial') {
        q = query(inventoryCollectionRef, orderBy("name"), limit(ITEMS_PER_PAGE));
      } else if (direction === 'next' && currentLastDoc) {
        q = query(inventoryCollectionRef, orderBy("name"), startAfter(currentLastDoc), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && currentFirstDoc) {
        q = query(inventoryCollectionRef, orderBy("name"), endBefore(currentFirstDoc), limitToLast(ITEMS_PER_PAGE));
      } else {
        q = query(inventoryCollectionRef, orderBy("name"), limit(ITEMS_PER_PAGE));
        setCurrentPage(1); 
      }

      const querySnapshot = await getDocs(q);
      const inventoryList = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as InventoryItem));
      
      setCurrentItems(inventoryList);

      if (querySnapshot.docs.length > 0) {
        setFirstVisibleDoc(querySnapshot.docs[0]);
        setLastVisibleDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setIsLastPage(querySnapshot.docs.length < ITEMS_PER_PAGE);
      } else {
        if (direction === 'next') {
          setIsLastPage(true);
          setCurrentPage(prevPage => Math.max(1, prevPage -1)); // Stay on prev page if next is empty
        } else if (direction === 'initial' || (direction === 'prev' && page === 1)) {
          setIsLastPage(true); // No items at all or no previous items from page 1
        }
        // If prev from page > 1 leads to empty, it implies no more previous pages
         if (direction === 'prev' && inventoryList.length === 0 && page > 1) {
             // This might indicate an issue or that the 'previous' set of docs is truly empty.
             // For now, we allow page to decrement, if it's then page 1 and still empty, firstVisibleDoc will be null.
         }

        if(inventoryList.length === 0 && page === 1) {
            setFirstVisibleDoc(null);
            setLastVisibleDoc(null);
        }
      }
    } catch (error) {
      console.error("Error fetching inventory items: ", error);
      toast({
        title: "Error Fetching Inventory",
        description: "Could not load inventory data from the database.",
        variant: "destructive",
      });
      setCurrentItems([]);
      setFirstVisibleDoc(null);
      setLastVisibleDoc(null);
      setIsLastPage(true);
    } finally {
      setIsLoadingItems(false);
    }
  }, [toast]);

  // Initial load and when searchTerm changes (triggers reset to page 1)
  useEffect(() => {
    setCurrentPage(1);
    setLastVisibleDoc(null);
    setFirstVisibleDoc(null);
    fetchInventoryPage(1, 'initial', null, null);
  }, [searchTerm, fetchInventoryPage]);


  const filteredItems = useMemo(() => {
    // Client-side search on the current page's items
    if (!searchTerm) return currentItems;
    return currentItems.filter(item => {
      const matchesSearchTerm = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (item.batchNo && item.batchNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                (item.unit && item.unit.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearchTerm;
    });
  }, [currentItems, searchTerm]);


  const handleEditItem = (itemToEdit: InventoryItem) => {
    router.push(`/inventory/edit/${itemToEdit.id}`);
  };

  const handleDeleteItem = async (itemId: string) => {
    const itemToDelete = currentItems.find(item => item.id === itemId);
    const itemName = itemToDelete ? itemToDelete.name : "The item";
    
    // Optimistically update UI could be complex with pagination, so we'll refetch.
    setIsLoadingItems(true); 
    try {
      await deleteDoc(doc(db, "inventory", itemId));
      toast({
        title: "Item Deleted",
        description: `${itemName} has been successfully deleted. Refreshing list...`,
      });
      // After delete, refetch the current page or go to page 1 if current page becomes empty
      // A simple robust way is to go back to page 1 to ensure cursors are valid.
      setCurrentPage(1);
      setLastVisibleDoc(null);
      setFirstVisibleDoc(null);
      fetchInventoryPage(1, 'initial', null, null); // Refetch page 1
    } catch (error) {
      console.error("Error deleting item from Firestore: ", error);
      toast({
        title: "Error Deleting Item",
        description: `Could not delete ${itemName}. Please try again.`,
        variant: "destructive",
      });
      setIsLoadingItems(false); // Stop loading if error
    }
  };
  
  const handleNextPage = () => {
    if (!isLastPage && !isLoadingItems) {
      setCurrentPage(prev => {
        const nextPage = prev + 1;
        fetchInventoryPage(nextPage, 'next', firstVisibleDoc, lastVisibleDoc);
        return nextPage;
      });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !isLoadingItems) {
      setCurrentPage(prev => {
        const prevPage = prev - 1;
        fetchInventoryPage(prevPage, 'prev', firstVisibleDoc, lastVisibleDoc);
        return prevPage;
      });
    }
  };
  
  // Callback to allow other components (e.g., import page after successful import) to trigger a refresh to page 1
  const refreshInventoryToFirstPage = useCallback(() => {
    setCurrentPage(1);
    setLastVisibleDoc(null);
    setFirstVisibleDoc(null);
    fetchInventoryPage(1, 'initial', null, null);
  }, [fetchInventoryPage]);


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
      {isLoadingItems && filteredItems.length === 0 ? ( // Show skeleton only when loading AND no items are displayed yet
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <InventoryTable items={filteredItems} onEdit={handleEditItem} onDelete={handleDeleteItem} />
      )}

      {!isLoadingItems && filteredItems.length === 0 && searchTerm && (
         <div className="text-center py-8 text-muted-foreground">
            No items match your search term "{searchTerm}" on this page. Try clearing filters or go to another page.
        </div>
      )}
      
      {!isLoadingItems && currentItems.length === 0 && !searchTerm && (
        <div className="text-center py-8 text-muted-foreground">
          No inventory items found.
        </div>
      )}

      {currentItems.length > 0 && (
          <div className="flex items-center justify-end space-x-2 py-4 mt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1 || isLoadingItems}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">Page {currentPage}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={isLastPage || isLoadingItems}
            >
              Next
            </Button>
          </div>
        )}
    </div>
  );
}
