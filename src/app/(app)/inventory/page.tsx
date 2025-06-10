
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { InventoryFilters } from "./components/InventoryFilters";
import { InventoryTable } from "./components/InventoryTable";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Mock data, in a real app this would come from an API
// Removed category and supplier from mock data
const initialInventoryItems: InventoryItem[] = [
  { id: "1", name: "Amoxicillin 250mg", description: "Broad-spectrum antibiotic", stock: 15, lowStockThreshold: 20, unitPrice: 0.50, expiryDate: "2024-12-31", tags: ["antibiotic", "prescription", "oral"], lastUpdated: "2023-10-01T10:00:00Z" },
  { id: "2", name: "Ibuprofen 200mg", description: "Nonsteroidal anti-inflammatory drug", stock: 50, lowStockThreshold: 30, unitPrice: 0.20, expiryDate: "2025-06-30", tags: ["otc", "painkiller", "fever"], lastUpdated: "2023-10-05T14:30:00Z" },
  { id: "3", name: "Vitamin C 1000mg", description: "Ascorbic acid supplement", stock: 5, lowStockThreshold: 10, unitPrice: 0.10, tags: ["supplement", "otc", "immune support"], lastUpdated: "2023-09-20T08:15:00Z" },
  { id: "4", name: "Metformin 500mg", description: "Oral diabetes medicine", stock: 75, lowStockThreshold: 25, unitPrice: 0.30, expiryDate: "2026-01-31", tags: ["prescription", "diabetes", "oral"], lastUpdated: "2023-10-02T11:00:00Z" },
  { id: "5", name: "Saline Solution 0.9%", description: "Sterile sodium chloride solution", stock: 30, lowStockThreshold: 15, unitPrice: 2.50, expiryDate: "2025-08-15", tags: ["sterile", "iv", "wound care"], lastUpdated: "2023-09-28T16:45:00Z" },
  { id: "6", name: "Aspirin 81mg", description: "Low-dose aspirin", stock: 120, lowStockThreshold: 40, unitPrice: 0.05, expiryDate: "2025-02-28", tags: ["otc", "heart health"], lastUpdated: new Date().toISOString() },
];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialInventoryItems);
  const [searchTerm, setSearchTerm] = useState("");
  // const [selectedCategory, setSelectedCategory] = useState("all"); // Removed
  // const [selectedSupplier, setSelectedSupplier] = useState("all"); // Removed
  const { toast } = useToast();

  // const categories = useMemo(() => Array.from(new Set(items.map(item => item.category))), [items]); // Removed
  // const suppliers = useMemo(() => Array.from(new Set(items.map(item => item.supplier))), [items]); // Removed

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearchTerm = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      // const matchesCategory = selectedCategory === "all" || item.category === selectedCategory; // Removed
      // const matchesSupplier = selectedSupplier === "all" || item.supplier === selectedSupplier; // Removed
      // return matchesSearchTerm && matchesCategory && matchesSupplier; // Removed
      return matchesSearchTerm;
    });
  // }, [items, searchTerm, selectedCategory, selectedSupplier]); // Removed dependencies
  }, [items, searchTerm]);


  const handleEditItem = (itemToEdit: InventoryItem) => {
    // In a real app, this would likely open a modal or navigate to an edit page
    console.log("Editing item:", itemToEdit);
    toast({
      title: "Edit Item",
      description: `Editing functionality for "${itemToEdit.name}" is not yet implemented.`,
    });
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    toast({
      title: "Item Deleted",
      description: "The inventory item has been successfully deleted.",
      variant: "destructive"
    });
  };
  
  useEffect(() => {
    const storedItems = localStorage.getItem('lpPharmacyInventory');
    if (storedItems) {
      try {
        const parsedItems = JSON.parse(storedItems);
        if (Array.isArray(parsedItems)) {
          setItems(parsedItems);
        }
      } catch (error) {
        console.error("Failed to parse stored inventory items:", error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lpPharmacyInventory', JSON.stringify(items));
  }, [items]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-headline">Inventory Management</h1>
        <Button asChild size="lg">
          <Link href="/inventory/add">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Item
          </Link>
        </Button>
      </div>

      <InventoryFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        // selectedCategory={selectedCategory} // Removed
        // setSelectedCategory={setSelectedCategory} // Removed
        // selectedSupplier={selectedSupplier} // Removed
        // setSelectedSupplier={setSelectedSupplier} // Removed
        // categories={categories} // Removed
        // suppliers={suppliers} // Removed
      />

      <InventoryTable items={filteredItems} onEdit={handleEditItem} onDelete={handleDeleteItem} />
    </div>
  );
}
