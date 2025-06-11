
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { InventoryFilters } from "./components/InventoryFilters";
import { InventoryTable } from "./components/InventoryTable";
import type { InventoryItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const initialInventoryItems: InventoryItem[] = [
  { id: "1", name: "Amoxicillin 250mg", batchNo: "AMX250-001", unit: "strip of 10", description: "Broad-spectrum antibiotic", stock: 15, lowStockThreshold: 20, mrp: 55.00, rate: 50.50, expiryDate: "2024-12-31", lastUpdated: "2023-10-01T10:00:00Z" },
  { id: "2", name: "Ibuprofen 200mg", batchNo: "IBU200-005", unit: "bottle of 50", description: "Nonsteroidal anti-inflammatory drug", stock: 50, lowStockThreshold: 30, mrp: 25.00, rate: 20.20, expiryDate: "2025-06-30", lastUpdated: "2023-10-05T14:30:00Z" },
  { id: "3", name: "Vitamin C 1000mg", batchNo: "VITC1K-010", unit: "tube of 20", description: "Ascorbic acid supplement", stock: 5, lowStockThreshold: 10, mrp: 12.00, rate: 10.10, lastUpdated: "2023-09-20T08:15:00Z" },
  { id: "4", name: "Metformin 500mg", unit: "box of 100", description: "Oral diabetes medicine", stock: 75, lowStockThreshold: 25, mrp: 35.00, rate: 30.00, expiryDate: "2026-01-31", lastUpdated: "2023-10-02T11:00:00Z" },
  { id: "5", name: "Saline Solution 0.9%", batchNo: "SAL09-002", unit: "500ml bag", description: "Sterile sodium chloride solution", stock: 30, lowStockThreshold: 15, mrp: 260.00, rate: 250.00, expiryDate: "2025-08-15", lastUpdated: "2023-09-28T16:45:00Z" },
  { id: "6", name: "Aspirin 81mg", unit: "bottle", description: "Low-dose aspirin", stock: 120, lowStockThreshold: 40, mrp: 8.00, rate: 5.00, expiryDate: "2025-02-28", lastUpdated: new Date().toISOString() },
];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialInventoryItems);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearchTerm = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (item.batchNo && item.batchNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                (item.unit && item.unit.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearchTerm;
    });
  }, [items, searchTerm]);


  const handleEditItem = (itemToEdit: InventoryItem) => {
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
        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
          setItems(parsedItems);
        } else if (Array.isArray(parsedItems) && parsedItems.length === 0) {
           setItems(initialInventoryItems); 
           localStorage.setItem('lpPharmacyInventory', JSON.stringify(initialInventoryItems));
        }
      } catch (error) {
        console.error("Failed to parse stored inventory items:", error);
        setItems(initialInventoryItems); 
        localStorage.setItem('lpPharmacyInventory', JSON.stringify(initialInventoryItems));
      }
    } else {
      setItems(initialInventoryItems);
      localStorage.setItem('lpPharmacyInventory', JSON.stringify(initialInventoryItems));
    }
  }, []);

  useEffect(() => {
    if(items !== initialInventoryItems){ 
      localStorage.setItem('lpPharmacyInventory', JSON.stringify(items));
    }
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
      />

      <InventoryTable items={filteredItems} onEdit={handleEditItem} onDelete={handleDeleteItem} />
    </div>
  );
}
