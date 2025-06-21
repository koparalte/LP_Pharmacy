"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, PackageSearch } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, startAt, endAt, orderBy } from "firebase/firestore";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderItemSelectorProps {
  onAddItem: (item: InventoryItem) => void;
  disabledItems: string[]; // Array of inventory item IDs that are already in the bill
}

export function OrderItemSelector({ onAddItem, disabledItems }: OrderItemSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = useCallback(async () => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const inventoryRef = collection(db, "inventory");
      const q = query(
        inventoryRef,
        orderBy("name"),
        startAt(searchTerm.toLowerCase()),
        endAt(searchTerm.toLowerCase() + '\uf8ff'),
        limit(15)
      );
      
      const querySnapshot = await getDocs(q);
      const items: InventoryItem[] = [];
      querySnapshot.forEach(doc => {
         const data = doc.data() as Omit<InventoryItem, 'id'>;
         // Secondary client-side filter because Firestore case-insensitive search is limited
         if (data.name.toLowerCase().includes(searchTerm.toLowerCase())) {
             items.push({ id: doc.id, ...data });
         }
      });
      
      setSearchResults(items);

    } catch (error) {
      console.error("Error searching inventory: ", error);
      toast({
        title: "Search Error",
        description: "Could not perform search.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, toast]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch();
    }, 300); // Debounce search
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, handleSearch]);

  const handleAddItemClick = (item: InventoryItem) => {
    if (item.stock > 0) {
      onAddItem(item);
    } else {
      toast({
        title: "Out of Stock",
        description: `${item.name} cannot be added as it is out of stock.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Add Items to Bill</CardTitle>
        <CardDescription>Search for products in your inventory to add them to the bill.</CardDescription>
        <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Search by product name (min 2 chars)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : searchResults.length > 0 ? (
                <ul className="space-y-2">
                    {searchResults.map(item => (
                    <li key={item.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                            Stock: <span className={item.stock > 0 ? 'font-bold text-green-600' : 'font-bold text-destructive'}>{item.stock}</span> | MRP: ₹{item.mrp.toFixed(2)}
                        </p>
                        </div>
                        <Button
                         size="sm"
                         onClick={() => handleAddItemClick(item)}
                         disabled={disabledItems.includes(item.id) || item.stock <= 0}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          {disabledItems.includes(item.id) ? "Added" : "Add"}
                        </Button>
                    </li>
                    ))}
                </ul>
            ) : (
                 <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-4">
                    <PackageSearch className="h-12 w-12 mb-4" />
                    <p>{searchTerm.length > 1 ? "No results found." : "Start typing to search for products."}</p>
                </div>
            )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
